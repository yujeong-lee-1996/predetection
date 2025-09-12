from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel
import pymysql
from database import db_config

import os, io, json, joblib, pandas as pd
from datetime import datetime

# 모델 경로 (로컬 또는 gs:// 지원)
MODEL_PF   = os.getenv("MODEL_PF",   "model_label_pf.pkl")
MODEL_ITHD = os.getenv("MODEL_ITHD", "model_label_ithd.pkl")
MODEL_VTHD = os.getenv("MODEL_VTHD", "model_label_vthd.pkl")

# DB컬럼 <-> 한글 피처명 매핑
FEATURE_MAP = {
    "누적전력량": "energy_total",
    "유효전력평균": "active_power_avg",
    "무효전력평균": "reactive_power_avg",
    "주파수": "frequency",
    "전류평균": "current_avg",
    "상전압평균": "phase_voltage_avg",
    "선간전압평균": "line_voltage_avg",
    "온도": "temperature",
    "R상유효전력": "r_active_power",
    "R상무효전력": "r_reactive_power",
    "R상전류": "r_current",
    "R상전압": "r_voltage",
    "R상선간전압": "r_line_voltage",
    "S상유효전력": "s_active_power",
    "S상무효전력": "s_reactive_power",
    "S상전류": "s_current",
    "S상전압": "s_voltage",
    "S상선간전압": "s_line_voltage",
    "T상유효전력": "t_active_power",
    "T상무효전력": "t_reactive_power",
    "T상전류": "t_current",
    "T상전압": "t_voltage",
    "T상선간전압": "t_line_voltage",
}

def _try_load_sidecar_features(path: str):
    # path.pkl 옆에 path.features.json / path.signature.json 있으면 읽어옴
    if not path.endswith(".pkl"): 
        return None
    base = path[:-4]
    for cand in (base + ".features.json", base + ".signature.json"):
        try:
            if cand.startswith("gs://"):
                from urllib.parse import urlparse
                from google.cloud import storage
                parsed = urlparse(cand)
                data = storage.Client().bucket(parsed.netloc).blob(parsed.path.lstrip("/")).download_as_bytes()
                feats = json.loads(data.decode("utf-8"))
            else:
                with open(cand, "r", encoding="utf-8") as f:
                    feats = json.load(f)
            if isinstance(feats, dict):
                feats = feats.get("columns") or feats.get("features")
            if isinstance(feats, list) and feats:
                return feats
        except Exception:
            continue
    return None

def load_pipeline(path):
    """로컬/GCS 경로 지원, (pipeline, features) 반환"""
    if not path:
        return (None, None)
    if isinstance(path, str) and path.startswith("gs://"):
        from urllib.parse import urlparse
        from google.cloud import storage
        parsed = urlparse(path)
        data = storage.Client().bucket(parsed.netloc).blob(parsed.path.lstrip("/")).download_as_bytes()
        obj = joblib.load(io.BytesIO(data))
    else:
        obj = joblib.load(path)

    if isinstance(obj, dict) and "pipeline" in obj:
        feats = obj.get("signature", {}).get("columns") or obj.get("features") or _try_load_sidecar_features(path)
        return obj["pipeline"], feats
    # 그냥 모델
    feats = _try_load_sidecar_features(path)
    return obj, feats

def infer_feature_list(model):
    # xgboost 계열/ sklearn 공통 탐색
    try:
        if hasattr(model, "get_booster"):
            b = model.get_booster()
            fn = getattr(b, "feature_names", None)
            if fn: return list(fn)
    except Exception: pass
    try:
        if hasattr(model, "feature_names_in_"):
            return list(model.feature_names_in_)
    except Exception: pass
    try:
        steps = []
        if hasattr(model, "steps"): steps = [est for _, est in model.steps]
        elif hasattr(model, "named_steps"): steps = list(model.named_steps.values())
        for est in steps:
            if hasattr(est, "get_booster"):
                b = est.get_booster()
                fn = getattr(b, "feature_names", None)
                if fn: return list(fn)
            if hasattr(est, "feature_names_in_"):
                return list(est.feature_names_in_)
    except Exception: pass
    return None

def row_to_model_X(row_dict: dict, feat_list: list) -> pd.DataFrame:
    data = {}
    for feat in feat_list:
        db_col = FEATURE_MAP.get(feat)
        if db_col is None:
            raise ValueError(f"FEATURE_MAP 매핑 없음: {feat}")
        data[feat] = pd.to_numeric(row_dict.get(db_col), errors="coerce")
    return pd.DataFrame([data])

def predict_with_model(model, row_dict: dict, feat_list: list | None, positive_label=2):
    if model is None:
        return (None, None)
    if not feat_list:
        feat_list = infer_feature_list(model)
    if not feat_list:
        raise RuntimeError("모델 feature 리스트를 찾을 수 없습니다. sidecar(features.json) 또는 feature_names 저장 필요.")
    X = row_to_model_X(row_dict, feat_list)
    y = int(model.predict(X)[0])
    prob = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[0]
        if hasattr(model, "classes_") and positive_label in list(model.classes_):
            idx = list(model.classes_).index(positive_label)
            prob = float(proba[idx])
        else:
            prob = float(proba[-1])
    return y, prob

def compute_alert_level(pf, ithd, vthd) -> int:
    present = [v for v in (pf, ithd, vthd) if v is not None]
    if not present: return 0
    warn = present.count(2)
    caution = present.count(1)
    if warn >= 2: return 3
    if warn >= 1: return 2
    if caution >= 2: return 1
    return 0

# 모델 지연 로딩(프로세스당 1회)
_models_cache = {"pf":None, "ithd":None, "vthd":None}

def get_models():
    if _models_cache["pf"] is None:
        _models_cache["pf"]   = load_pipeline(MODEL_PF)
    if _models_cache["ithd"] is None:
        _models_cache["ithd"] = load_pipeline(MODEL_ITHD)
    if _models_cache["vthd"] is None:
        _models_cache["vthd"] = load_pipeline(MODEL_VTHD)
    return _models_cache["pf"], _models_cache["ithd"], _models_cache["vthd"]

router=APIRouter(tags=["prediction"])
@router.post("/data")
def post_data(payload: dict= Body(...)):
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO prediction_data(
                    facility_id,
                    ts,
                    energy_total,
                    active_power_avg,
                    reactive_power_avg,
                    frequency,
                    current_avg,
                    phase_voltage_avg,
                    line_voltage_avg,
                    temperature,
                    r_active_power,
                    r_reactive_power,
                    r_current,
                    r_voltage,
                    r_line_voltage,
                    s_active_power,
                    s_reactive_power,
                    s_current,
                    s_voltage,
                    s_line_voltage,
                    t_active_power,
                    t_reactive_power,
                    t_current,
                    t_voltage,
                    t_line_voltage
                ) VALUES(
                    %s,NOW(),%s,%s,%s,%s,%s,
                    %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
                )
            """,(
                payload.get("facility_id"),
                payload.get("누적전력량"),
                payload.get("유효전력평균"),
                payload.get("무효전력평균"),
                payload.get("주파수"),
                payload.get("전류평균"),
                payload.get("상전압평균"),
                payload.get("선간전압평균"),
                payload.get("온도"),
                payload.get("R상유효전력"),
                payload.get("R상무효전력"),
                payload.get("R상전류"),
                payload.get("R상전압"),
                payload.get("R상선간전압"),
                payload.get("S상유효전력"),
                payload.get("S상무효전력"),
                payload.get("S상전류"),
                payload.get("S상전압"),
                payload.get("S상선간전압"),
                payload.get("T상유효전력"),
                payload.get("T상무효전력"),
                payload.get("T상전류"),
                payload.get("T상전압"),
                payload.get("T상선간전압"),


                ))
            rid = cursor.lastrowid

            # 2) 바로 예측 (payload 값으로 row_dict 구성)
            row_dict = {}
            for k, dbcol in FEATURE_MAP.items():
                row_dict[dbcol] = payload.get(k)

            # 모델 로딩(캐시 사용)
            (model_pf, pf_feats), (model_ithd, ithd_feats), (model_vthd, vthd_feats) = get_models()

            # 예측
            y_pf,   p_pf   = predict_with_model(model_pf,   row_dict, pf_feats)
            y_ithd, p_ithd = predict_with_model(model_ithd, row_dict, ithd_feats)
            y_vthd, p_vthd = predict_with_model(model_vthd, row_dict, vthd_feats)
            alert = compute_alert_level(y_pf, y_ithd, y_vthd)

            # 3) 같은 행을 업데이트: pred_* 채우고 status='PREDICTED'
            cursor.execute("""
                UPDATE prediction_data
                   SET pred_pf_label    = %s,
                       pred_pf_prob     = %s,
                       pred_ithd_label  = %s,
                       pred_ithd_prob   = %s,
                       pred_vthd_label  = %s,
                       pred_vthd_prob   = %s,
                       pred_alert_level = %s,
                       inferred_at      = NOW(),
                       status           = 'PREDICTED'
                 WHERE data_id = %s
                 LIMIT 1
            """, (
                int(y_pf), float(p_pf or 0),
                int(y_ithd), float(p_ithd or 0),
                int(y_vthd), float(p_vthd or 0),
                int(alert),
                int(rid),
            ))

            # 4) facility.status 동기화
            cursor.execute("""
                UPDATE facility
                   SET status = %s
                 WHERE facility_id = %s
                 LIMIT 1
            """, (int(alert), int(payload.get("facility_id"))))
            conn.commit()
            return {"message":"데이터가 등록되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/status/count")
def status_counts():
    sql = """
        SELECT `status` AS level, COUNT(*) AS cnt
        FROM facility
        WHERE del_yn='N'
        GROUP BY `status`
    """
    try:
        conn = pymysql.connect(**db_config,)
        with conn:
            with conn.cursor(pymysql.cursors.DictCursor) as cur:
                cur.execute(sql)
                rows = cur.fetchall()  # 예: [{'level': 0, 'cnt': 5}, {'level': 2, 'cnt': 1}]
    except Exception as e:
        # 여기서 'cur' 같은 미정의 변수 찍지 말고 안전하게 로그만 출력
        print("[/prediction/status/count] DB error:", e)
        print("[SQL]", sql)
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"DB error: {e}")

    # 0~3 누락 보정
    counts = {0: 0, 1: 0, 2: 0, 3: 0}
    for r in rows:
        lvl_raw = r.get("level")
        cnt_raw = r.get("cnt", 0)
        try:
            lvl = int(lvl_raw)
            cnt = int(cnt_raw)
        except (TypeError, ValueError):
            continue
        if lvl in counts:
            counts[lvl] = cnt

    return {
        "countsByLevel": [{"level": k, "count": counts[k]} for k in (0, 1, 2, 3)],
        "total": sum(counts.values()),
    }
@router.get("/count/nomal")
def nomal_count():
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                        SELECT COUNT(*) AS count
                           FROM facility
                           WHERE
                            del_yn='N' AND status=0
                           """,())
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="설비가 없습니다.")
            
            return{"count":row["count"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
@router.get("/count/caution")
def caution_count():
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                        SELECT COUNT(*) AS count
                           FROM facility
                           WHERE
                            del_yn='N' AND status=1
                           """,())
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="설비가 없습니다.")
            
            return{"count":row["count"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
@router.get("/count/warning")
def warning_count():
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                        SELECT COUNT(*) AS count
                           FROM facility
                           WHERE
                            del_yn='N' AND status=2
                           """,())
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="설비가 없습니다.")
            
            return{"count":row["count"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
@router.get("/count/critical")
def criticall_count():
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                        SELECT COUNT(*) AS count
                           FROM facility
                           WHERE
                            del_yn='N' AND status=3
                           """,())
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="설비가 없습니다.")
            
            return{"count":row["count"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
import pandas as pd
import joblib
from sqlalchemy import create_engine, text
from datetime import datetime
import streamlit as st
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
import io, os, time
from sqlalchemy.engine import URL

st.markdown("""
<style>
    .st-emotion-cache-1it367d {padding:10px;}
            .st-emotion-cache-r44huj p {margin:0}
</style>
""", unsafe_allow_html=True)

fid_raw = st.query_params.get("facility_id")
try:
    facility_id = int(fid_raw) if fid_raw is not None else None
except:
    facility_id = None

if not facility_id:
    st.error("facility_id가 없습니다. 설비 상세에서 접근해주세요.")
    st.stop()
# =====================[ DB 연결 ]=====================
# engine = create_engine("mysql+pymysql://root:Jk429729!!@localhost:3306/pffp?charset=utf8mb4")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3307"))          # Cloud SQL Proxy 포트
DB_USER = os.getenv("DB_USER", "appuser")
DB_PASS = os.getenv("DB_PASS", "P@ssw0rd!")
DB_NAME = os.getenv("DB_NAME", "predictions_db")

# 모델 경로 (gs:// 가능) ─ 지금은 vthd만 필수
MODEL_PF   = os.getenv("MODEL_PF",   "gs://human_accident_prediction3/models/0909/선휘pf.pkl")
MODEL_ITHD = os.getenv("MODEL_ITHD", "gs://human_accident_prediction3/models/0909/선휘ithd.pkl")
MODEL_VTHD = os.getenv("MODEL_VTHD", "gs://human_accident_prediction3/models/0909/선휘vthd.pkl")

def make_engine():
    url = URL.create(
        "mysql+pymysql",
        username=DB_USER,
        password=DB_PASS,  # 특수문자 안전
        host=DB_HOST,
        port=DB_PORT,
        database=DB_NAME,
        query={"charset": "utf8mb4"},
    )
    return create_engine(
        url, pool_pre_ping=True, pool_recycle=1800, connect_args={"connect_timeout": 10}
    )

engine = make_engine()

# =====================[ FEATURE MAP ]=====================
FEATURE_MAP = {
    "누적전력량":            "energy_total",
    "유효전력평균":          "active_power_avg",
    "무효전력평균":          "reactive_power_avg",
    "주파수":               "frequency",
    "전류평균":             "current_avg",
    "상전압평균":            "phase_voltage_avg",
    "선간전압평균":          "line_voltage_avg",
    "온도":                "temperature",

    "R상유효전력":         "r_active_power",
    "R상무효전력":         "r_reactive_power",
    "R상전류":            "r_current",
    "R상전압":           "r_voltage",
    "R상선간전압":         "r_line_voltage",

    "S상유효전력":         "s_active_power",
    "S상무효전력":         "s_reactive_power",
    "S상전류":            "s_current",
    "S상전압":           "s_voltage",
    "S상선간전압":         "s_line_voltage",

    "T상유효전력":         "t_active_power",
    "T상무효전력":         "t_reactive_power",
    "T상전류":            "t_current",
    "T상전압":           "t_voltage",
    "T상선간전압":         "t_line_voltage",
}

# =====================[ 카드 디자인 ]=====================
LABEL_TEXT = {0: "정상", 1: "주의", 2: "경고", 3: "심각"}
LABEL_COLOR = {0: "#22c55e", 1: "#facc15", 2: "#fb923c", 3: "#ef4444"}


# =====================[ 모델 로딩 함수 ]=====================
# def load_pipeline(path):
#     obj = joblib.load(path)
#     if isinstance(obj, dict) and "pipeline" in obj:
#         return obj["pipeline"], obj.get("signature", {}).get("columns")
#     return obj, None  # 그냥 모델인 경우
def load_pipeline(path):
    """
    path가 로컬 파일이면 그대로 joblib.load(path)
    path가 'gs://bucket/path.pkl' 이면 GCS에서 바이트로 받아서 로드
    반환: (pipeline_or_model, features_or_None)
    """
    obj = None

    # 1) GCS 경로인지 확인
    if isinstance(path, str) and path.startswith("gs://"):
        # 지연 import (로컬 파일만 쓸 땐 의존성 없어도 동작)
        from urllib.parse import urlparse
        from google.cloud import storage

        parsed = urlparse(path)                # gs://bucket/dir/file.pkl
        bucket = parsed.netloc
        blob_path = parsed.path.lstrip("/")

        client = storage.Client()
        blob = client.bucket(bucket).blob(blob_path)
        data = blob.download_as_bytes()        # 한글 파일명도 OK
        obj = joblib.load(io.BytesIO(data))
    else:
        # 2) 로컬 파일/경로는 기존과 동일
        obj = joblib.load(path)

    # 3) 저장 포맷이 dict일 때 pipeline/feature 추출 (기존 로직 유지 + 보강)
    if isinstance(obj, dict) and "pipeline" in obj:
        feats = obj.get("signature", {}).get("columns") or obj.get("features")
        return obj["pipeline"], feats

    return obj, None  # 그냥 모델인 경우

# =====================[ 입력 변환 함수 ]=====================
def row_to_model_X(row_dict: dict, model_feature_list: list) -> pd.DataFrame:
    data = {}
    for feat in model_feature_list:
        db_col = FEATURE_MAP.get(feat)
        if db_col is None:
            raise ValueError(f"❌ FEATURE_MAP에 '{feat}' 매핑이 없습니다.")
        data[feat] = pd.to_numeric(row_dict.get(db_col), errors="coerce")
    return pd.DataFrame([data])

# =====================[ 예측 함수 ]=====================
def predict_with_model(model, row, feat_list):
    if feat_list is None and hasattr(model, "booster_"):
        feat_list = model.booster_.feature_name()
    X = row_to_model_X(row, feat_list)
    y = model.predict(X.values)[0]
    prob = model.predict_proba(X.values)[0][-1] if hasattr(model, "predict_proba") else None
    return int(y), float(prob) if prob is not None else None

# # =====================[ 알람 레벨 계산 ]=====================

# def compute_alert_level(pf, ithd, vthd):
#     warn = [pf, ithd, vthd].count(2)
#     caution = [pf, ithd, vthd].count(1)
#     if warn >= 2: return 3
#     if warn >= 1: return 2
#     if caution >= 2: return 1
#     return 0
# # =====================[ 확률 계산 ]=====================
# def render_alert_level(pf, ithd, vthd):
#     level = compute_alert_level(pf, ithd, vthd)

#     level_texts = {
#         0: "NORMAL",
#         1: "CAUTION",
#         2: "WARNING",
#         3: "CRITICAL"
#     }
#     level_colors = {
#         0: "#22c55e",  # green
#         1: "#facc15",  # yellow
#         2: "#fb923c",  # orange
#         3: "#ef4444",  # red
#     }

#     fig, ax = plt.subplots(figsize=(2.8, 2.8))
#     ax.pie([1], radius=1, colors=[level_colors[level]],
#            wedgeprops=dict(width=0.3, edgecolor='white'))

#     ax.text(
#         0, 0,
#         f"Level {level}\n{level_texts[level]}",
#         ha='center', va='center', fontsize=14, weight='bold'
#     )
    # st.pyplot(fig)

    
def render_card(title, label_value, subtext, icon="⚡"):
    label = LABEL_TEXT.get(label_value, "-")
    color = LABEL_COLOR.get(label_value, "#6b7280")
    st.markdown(f"""
    <div style="background:#1f2937;padding:20px;border-radius:14px;text-align:center;min-height:170px;">
        <div style="font-size:28px;">{icon}</div>
        <div style="font-size:18px;font-weight:700;color:white;margin-top:6px;">{title}</div>
        <div style="margin-top:10px;">
            <span style="background:{color};color:white;padding:6px 18px;border-radius:999px;font-weight:600;">
                {label}
            </span>
        </div>
        <div style="font-size:12px;margin-top:8px;color:#cbd5e1;">{subtext}</div>
    </div>
    """, unsafe_allow_html=True)


# =====================[ 알람 레벨]=====================
fid = facility_id
alert_score = pd.read_sql(text("""
    SELECT 
        pred_alert_level,
        pred_pf_label, 
        pred_ithd_label,
        pred_vthd_label
    FROM prediction_data
    WHERE facility_id = :fid
    AND status = 'PREDICTED'
    ORDER BY ts DESC
    LIMIT 1
"""), engine, params={"fid": fid})

if not alert_score.empty:
    alert_level = alert_score.loc[0, "pred_alert_level"]
    pred_pf     = alert_score.loc[0, "pred_pf_label"]
    pred_ithd   = alert_score.loc[0, "pred_ithd_label"]
    pred_vthd   = alert_score.loc[0, "pred_vthd_label"]
else:
    alert_level = pred_pf = pred_ithd = pred_vthd = None

# =====================[ 알람 레벨 시간순 그래프 ]=====================

df_history = pd.read_sql(text("""
    SELECT ts, pred_alert_level
    FROM prediction_data
    WHERE facility_id = :fid
    AND status = 'PREDICTED'
    ORDER BY ts ASC
    LIMIT 50
"""), engine, params={"fid": fid})
df_daily = pd.Series(dtype=float)
if df_history.empty:
    st.info("예측 이력이 없습니다.")
else:
    df_history["ts"] = pd.to_datetime(df_history["ts"])
    df_history["date"] = df_history["ts"].dt.date
    df_daily = df_history.groupby("date")["pred_alert_level"].mean()
    df_daily.index = df_daily.index.astype(str)


# =====================[ pf, ithd, vthd 시계열 그래프 ]=====================
dff_history=pd.read_sql(text("""
                            SELECT 
                                ts,
                                pred_pf_label, 
                                pred_pf_prob,
                                pred_ithd_label,
                                pred_ithd_prob,
                                pred_vthd_label,
                                pred_vthd_prob
                            FROM prediction_data
                            WHERE facility_id=:fid
                            AND status="PREDICTED"
                                ORDER BY ts ASC
                                LIMIT 50
                            """), engine, params={"fid": fid} )
dff_daily = pd.DataFrame()

if dff_history.empty:
    st.info("예측 이력이 없습니다.")
else:
    dff_history["ts"] = pd.to_datetime(dff_history["ts"])
    dff_history["date"] = dff_history["ts"].dt.date

    # 같은 날짜 여러 건이면 라벨/확률 평균
    dff_daily = (
        dff_history.groupby("date")[[
            "pred_pf_label","pred_pf_prob",
            "pred_ithd_label","pred_ithd_prob",
            "pred_vthd_label","pred_vthd_prob"
        ]].mean().reset_index()
    )

    # 확률이 있으면 확률 사용, 없으면 라벨을 score로 변환
    label_to_score = {0: 0.05, 1: 0.40, 2: 0.70, 3: 0.95}

    def pick(prob, label):
        # prob가 NaN이면 label을 score로
        return prob if pd.notna(prob) else label_to_score.get(int(label), None)

    dff_daily["pf"]   = [pick(p,l) for p,l in zip(dff_daily["pred_pf_prob"],   dff_daily["pred_pf_label"])]
    dff_daily["ithd"] = [pick(p,l) for p,l in zip(dff_daily["pred_ithd_prob"], dff_daily["pred_ithd_label"])]
    dff_daily["vthd"] = [pick(p,l) for p,l in zip(dff_daily["pred_vthd_prob"], dff_daily["pred_vthd_label"])]
# =====================[ Streamlit UI 시작 ]=====================
st.set_page_config(page_title="전력설비 예측 결과", layout="wide")

query_ingested = """
SELECT * FROM prediction_data
WHERE facility_id = :fid
AND status = 'INFERRED'
ORDER BY ts DESC
LIMIT 1
"""
row = pd.read_sql(text(query_ingested), engine, params={"fid": fid})

if row.empty:
    query_latest_predicted = """
    SELECT * FROM prediction_data
    WHERE facility_id = :fid
    AND status = 'PREDICTED'
    ORDER BY ts DESC
    LIMIT 1
    """
    row = pd.read_sql(text(query_latest_predicted), engine, params={"fid": fid})

    if row.empty:
        # st.warning("예측할 데이터도 없고, 예측된 데이터도 없습니다.")
        st.stop()
    else:
        # st.success("최근 예측된 결과를 불러왔습니다.")
        row_dict = row.iloc[0].to_dict()
else:
    # st.info("예측 가능한 데이터를 불러왔습니다.")
    row_dict = row.iloc[0].to_dict()
    # 여기서 예측 수행하고 UPDATE도 진행
# =====================[ 모델별 예측 실행 ]=====================
# model_pf, pf_feats = load_pipeline("model_label_pf.pkl")
# model_ithd, ithd_feats = load_pipeline("model_label_ithd.pkl")
# model_vthd, vthd_feats = load_pipeline("model_label_vthd.pkl")

# model_pf, pf_feats   = load_pipeline("gs://human_accident_prediction3/models/0909/선휘pf.pkl")
# model_ithd, ithd_feats = load_pipeline("gs://human_accident_prediction3/models/0909/선휘ithd.pkl")
# model_vthd, vthd_feats = load_pipeline("gs://human_accident_prediction3/models/0909/선휘vthd.pkl")

# pred_pf, pf_prob     = predict_with_model(model_pf, row_dict, pf_feats)
# pred_ithd, ithd_prob = predict_with_model(model_ithd, row_dict, ithd_feats)
# pred_vthd, vthd_prob = predict_with_model(model_vthd, row_dict, vthd_feats)

# alert_level = compute_alert_level(pred_pf, pred_ithd, pred_vthd)

# =====================[ 시각화 ]=====================
st.markdown(f"""
<div style="display:flex; justify-content:end;">

 최근 측정 시각: {row_dict['ts']}
            </div>
            """, unsafe_allow_html=True)


# =====================[ 종합 예측]=====================
col1, col2, col3, col4 = st.columns(4)
with col1:
    render_card("종합", alert_level, "전력 시스템의 종합 상태", "🚨")
with col2:
    render_card("역률", pred_pf, "전력 시스템의 역률 상태", "🔌")
with col3:
    render_card("전류 고조파", pred_ithd, "전류 고조파 왜곡 수준", "📈")
with col4:
    render_card("전압 고조파", pred_vthd, "전압 고조파 왜곡 수준", "📊")
st.markdown("---")

# st.success(f"**{alert_level}단계** (0: 정상 ~ 3: 즉시 조치)") if alert_level else st.info("정상 상태입니다.")



# =====================[ DB에 예측 결과 저장 ]=====================
# with engine.begin() as conn:
#     result = conn.execute(text("""
#         UPDATE prediction_data
#         SET
#             pred_pf_label     = :pf_label,
#             pred_pf_prob      = :pf_prob,
#             pred_ithd_label   = :ithd_label,
#             pred_ithd_prob    = :ithd_prob,
#             pred_vthd_label   = :vthd_label,
#             pred_vthd_prob    = :vthd_prob,
#             pred_alert_level  = :alert,
#             inferred_at       = :inferred,
#             status            = 'PREDICTED'
#         WHERE data_id = :id
#         AND status = 'INFERRED'
#     """), {
#         "pf_label":   pred_pf,
#         "pf_prob":    pf_prob or 0,
#         "ithd_label": pred_ithd,
#         "ithd_prob":  ithd_prob or 0,
#         "vthd_label": pred_vthd,
#         "vthd_prob":  vthd_prob or 0,
#         "alert":      alert_level,
#         "inferred":   datetime.now(),
#         "id":         int(row_dict["data_id"])
#     })

#     result2 = conn.execute(text("""
#         UPDATE facility
#         SET status = :alert_level
#         WHERE facility_id = :fid
#     """), {
#         "alert_level": alert_level,
#         "fid": int(row_dict["facility_id"])
#     })

# =====================[  예측 알람 레벨 변화 추이 ]=====================
st.markdown(
    "<span style='font-size:22px; font-weight:500;'>예측 알람 레벨 변화 추이</span>",
    unsafe_allow_html=True
    )
if not df_daily.empty:
    fig, ax = plt.subplots(figsize=(8,2))
    ax.plot(df_daily.index, df_daily.values, marker=".")
    ax.set_ylim(0, 3.5)
    ax.set_xlabel("date", fontsize=6) 
    ax.set_ylabel("alert level", fontsize=6)
    ax.grid(True, alpha=0.3)
    plt.xticks(rotation=45, fontsize=6)
    plt.yticks(fontsize=6)
    st.pyplot(fig)
else:
    st.info("표시할 데이터가 없습니다.")

st.markdown(
"<span style='font-size:22px; font-weight:500;'>모델 예측 확률 시계열</span>",
unsafe_allow_html=True
)

if not dff_history.empty:
    dd = dff_history.sort_values("ts")

    # 1) 확률 시계열
    fig_prob, ax_prob = plt.subplots(figsize=(8,3))
    ax_prob.plot(dd["ts"], dd["pred_pf_prob"],   marker=".", label="PF prob")
    ax_prob.plot(dd["ts"], dd["pred_ithd_prob"], marker=".", label="ITHD prob")
    ax_prob.plot(dd["ts"], dd["pred_vthd_prob"], marker=".", label="VTHD prob")
    ax_prob.set_ylim(0,1)
    ax_prob.set_ylabel("Probability")
    ax_prob.tick_params(axis="x", labelrotation=45, labelsize=7)
    ax_prob.grid(True, alpha=0.3)
    ax_prob.legend(fontsize=7)
    st.pyplot(fig_prob)

#     # 2) 라벨 시계열
#     st.markdown(
# "<span style='font-size:22px; font-weight:600;'>📈모델 예측 시계열 (0=정상,1=주의,2=경고,3=심각)</span>",
# unsafe_allow_html=True
#     )
#     fig_label, ax_label = plt.subplots(figsize=(8,3))
#     ax_label.plot(dd["ts"], dd["pred_pf_label"],   marker=".", label="PF label")
#     ax_label.plot(dd["ts"], dd["pred_ithd_label"], marker=".", label="ITHD label")
#     ax_label.plot(dd["ts"], dd["pred_vthd_label"], marker=".", label="VTHD label")
#     ax_label.set_ylim(-0.5,3.5)
#     ax_label.set_ylabel("Label (0~3)")
#     ax_label.tick_params(axis="x", labelrotation=45, labelsize=7)
#     ax_label.grid(True, alpha=0.3)
#     ax_label.legend(fontsize=7)
#     st.pyplot(fig_label)

else:
    st.info("모델 시계열을 표시할 데이터가 없습니다.")
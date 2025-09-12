from fastapi import APIRouter, HTTPException, Depends, Body, Query
from pydantic import BaseModel
import pymysql
from database import db_config
import math

router=APIRouter(tags=["facility"])

@router.post("/register")
def register_facility(payload: dict= Body(...)):
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor() as cursor:
            cursor.execute("""
                INSERT INTO facility(
                    name,
                    `type`,
                    manufacturer,
                    location,
                    install_date,
                    last_inspection,
                    next_inspection,
                    del_yn,
                    created_at
                ) VALUES(
                    %s,%s,%s,%s,%s,%s,
                    %s,'N',NOW()
                )
            """,(
                payload.get("facilityName"),
                payload.get("facilityType"),
                payload.get("facilityManufacturer"),
                payload.get("facilityLocation"),
                payload.get("facilityInstallDate"),
                payload.get("facilityLastInspection") or None,
                payload.get("facilityNextInspection") or None,
                ))
            conn.commit()
            return {"message":"설비가 등록되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/list")
def list_facility(
    page: int = 1):
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            page_size=15
            offset=(page-1)*page_size
            cursor.execute("""
                SELECT COUNT(*) AS total
                FROM facility
                WHERE del_yn='N'
            """)
            total = cursor.fetchone()["total"]

            
            cursor.execute("""
                        SELECT
                           *
                           FROM 
                            facility
                           WHERE
                            del_yn='N'
                           ORDER BY created_at ASC, facility_id ASC
                           LIMIT %s OFFSET %s
                           """,(page_size, offset))
            facilities=cursor.fetchall()
            if not facilities:
                raise HTTPException(status_code=404, detail="등록된 설비가 없습니다.")
            
            return {
                    "page": page,
                    "totalPages": (total + page_size - 1) // page_size,
                    "facilities": facilities
                    }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/list/critical")
def list_critical():
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                           SELECT
                            facility_id,
                            name
                           FROM
                            facility
                           WHERE 
                           del_yn='N'
                           AND 
                           status=3
                           ORDER BY created_at ASC
                           """,())
            facilities=cursor.fetchall()
            if not facilities:
                raise HTTPException(status_code=404, detail="심각 설비가 없습니다.")
            return{"facilities":facilities}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
@router.get("/info/{facility_id}")
def info_facility(facility_id: int):
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                        SELECT
                           facility_id,
                           name,
                           `type`,
                           manufacturer,
                           location,
                           install_date,
                           last_inspection,
                           next_inspection,
                           del_yn
                           FROM 
                            facility
                           WHERE
                            del_yn='N' AND facility_id=%s
                           """,(facility_id,))
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="설비 정보가 없습니다.")
            
            return{"facility":row}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/count")
def all_count():
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                        SELECT COUNT(*) AS count
                           FROM facility
                           WHERE
                            del_yn='N'
                           """,())
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="설비가 없습니다.")
            
            return{"count":row["count"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/delete/{facility_id}")
def delete_facility(facility_id: int):
    conn=pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                UPDATE facility
                SET del_yn='Y'
                 WHERE facility_id=%s

                """,(facility_id))
            conn.commit()
            return {"massage":"설비가 삭제되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
    
@router.put("/update/{facility_id}")
def update_facility(facility_id: int, payload: dict = Body(...)):
    conn = pymysql.connect(**db_config)
    try:
        with conn.cursor() as cursor:
            sql = """
                UPDATE facility
                SET
                    name=%s,
                    type=%s,
                    manufacturer=%s,
                    location=%s,
                    install_date=%s,
                    last_inspection=%s,
                    next_inspection=%s,
                    updated_at=NOW()
                WHERE facility_id=%s AND del_yn='N'
            """
            params = (
                payload.get("name"),
                payload.get("type"),
                payload.get("manufacturer"),
                payload.get("location"),
                payload.get("install_date"),
                payload.get("last_inspection"),
                payload.get("next_inspection"),
                facility_id,
            )
            cursor.execute(sql, params)
            conn.commit()
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="대상 설비가 없거나 이미 삭제되었습니다.")
            return {"message": "설비 정보가 수정되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()


@router.get("/status/daily")
def get_daily_status():
    conn = pymysql.connect(**db_config)
    try:
        with conn.cursor(pymysql.cursors.DictCursor) as cursor:
            cursor.execute("""
                SELECT DATE(created_at) AS date,
                       pred_alert_level AS alert_level,
                       COUNT(*) AS cnt
                FROM prediction_data
                GROUP BY DATE(created_at), pred_alert_level
                ORDER BY DATE(created_at)
            """)
            rows = cursor.fetchall()
            return {"data": rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()
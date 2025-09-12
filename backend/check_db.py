# check_db_full.py
import os, sys, pymysql, csv
from datetime import datetime

HOST = os.getenv("DB_HOST", "127.0.0.1")
PORT = int(os.getenv("DB_PORT", "3307"))
USER = os.getenv("DB_USER", "appuser")
PASS = os.getenv("DB_PASS", "P@ssw0rd!")
DB   = os.getenv("DB_NAME", "predictions_db")

# 옵션: python check_db_full.py [WHERE절] [LIMIT]
WHERE = sys.argv[1] if len(sys.argv) >= 2 else ""      # 예: "status='PREDICTED' AND facility_id='FAC-001'"
LIMIT = int(sys.argv[2]) if len(sys.argv) >= 3 else 50 # 기본 50행

conn = pymysql.connect(host=HOST, port=PORT, user=USER, password=PASS,
                       database=DB, autocommit=True, charset="utf8mb4",
                       cursorclass=pymysql.cursors.DictCursor)

def print_rows(rows, max_rows=10):
    """콘솔에 예쁘게 몇 줄만 미리보기"""
    for i, r in enumerate(rows[:max_rows], 1):
        print(f"[{i}] {r}")
    if len(rows) > max_rows:
        print(f"... ({len(rows)-max_rows} more rows)")

with conn.cursor() as cur:
    print(f"[INFO] {datetime.now().isoformat()}  Connected  host={HOST} port={PORT} user={USER} db={DB}")

    # DB/계정 확인
    cur.execute("SELECT DATABASE() AS db, CURRENT_USER() AS user")
    print("[INFO] Session:", cur.fetchone())

    # 테이블 목록
    cur.execute("SHOW TABLES")
    tables = [list(r.values())[0] for r in cur.fetchall()]
    print("[INFO] Tables:", tables)

    # prediction_data 스키마
    if "prediction_data" in tables:
        cur.execute("SHOW CREATE TABLE prediction_data")
        create_stmt = cur.fetchone()["Create Table"]
        print("\n[SCHEMA] prediction_data")
        print(create_stmt, "\n")

        # 전체 건수
        cur.execute("SELECT COUNT(*) AS cnt FROM prediction_data")
        total = cur.fetchone()["cnt"]
        print(f"[INFO] prediction_data count = {total}")

        # 상태별 집계
        cur.execute("""
            SELECT status, COUNT(*) AS cnt
            FROM prediction_data
            GROUP BY status
            ORDER BY cnt DESC
        """)
        status_rows = cur.fetchall()
        print("[INFO] by status:", status_rows)

        # 최근 데이터 미리보기
        where_clause = f"WHERE {WHERE}" if WHERE else ""
        sql = f"""
            SELECT *
            FROM prediction_data
            {where_clause}
            ORDER BY id DESC
            LIMIT {LIMIT}
        """
        cur.execute(sql)
        rows = cur.fetchall()
        print(f"\n[DATA] preview ({len(rows)} rows)  SQL= {sql.strip()}")
        print_rows(rows, max_rows=min(10, LIMIT))

        # CSV로 저장(원하면 주석 해제)
        # if rows:
        #     out = "prediction_data_dump.csv"
        #     with open(out, "w", newline="", encoding="utf-8-sig") as f:
        #         w = csv.DictWriter(f, fieldnames=rows[0].keys())
        #         w.writeheader()
        #         w.writerows(rows)
        #     print(f"\n[INFO] Saved to {os.path.abspath(out)}")
    else:
        print("[WARN] prediction_data 테이블이 없습니다. 스키마를 먼저 적용하세요.")

conn.close()

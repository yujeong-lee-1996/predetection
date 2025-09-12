# simple_fetch_top5.py
import pymysql

# ▶ 필요한 값만 바꿔주세요
HOST = "127.0.0.1"     # Cloud SQL Proxy 주소
PORT = 3307            # Proxy 포트 (다르면 변경)
USER = "appuser"
PASSWORD = "P@ssw0rd!"
DB = "predictions_db"
TABLE = "prediction_data"  # 다른 테이블이면 바꾸기

def main():
    conn = pymysql.connect(
        host=HOST,
        port=PORT,
        user=USER,
        password=PASSWORD,
        database=DB,
        charset="utf8mb4",
        cursorclass=pymysql.cursors.DictCursor,  # dict로 받아서 보기 편하게
    )
    try:
        with conn.cursor() as cur:
            sql = f"SELECT * FROM `{TABLE}` ORDER BY ts DESC LIMIT 5"
            cur.execute(sql)
            rows = cur.fetchall()
            for i, row in enumerate(rows, 1):
                print(f"[{i}] {row}")
    finally:
        conn.close()

if __name__ == "__main__":
    main()

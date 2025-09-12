import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

# db_config = {
#     "host": os.getenv("MYSQL_HOST", "127.0.0.1"),
#     "user": os.getenv("MYSQL_USER", "root"),
#     "password": os.getenv("MYSQL_PASSWORD", "Jk429729!!"),
#     "database": os.getenv("MYSQL_DATABASE", "PFFP"),
#     "charset": "utf8mb4",
#     "cursorclass": pymysql.cursors.DictCursor,
# }
db_config = {
    "host": os.getenv("MYSQL_HOST", "127.0.0.1"),  # 프록시
    "port": int(os.getenv("MYSQL_PORT", "3307")),
    "user": os.getenv("MYSQL_USER", "appuser"),
    "password": os.getenv("MYSQL_PASSWORD", "P@ssw0rd!"),
    "database": os.getenv("MYSQL_DATABASE", "predictions_db"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": True,
}



try:
    conn = pymysql.connect(**db_config)
    cursor = conn.cursor()
    cursor.execute("SELECT DATABASE();")
    result = cursor.fetchone()
    print("✅ Connected to DB:", result)
except Exception as e:
    print("❌ DB 연결 실패:", e)
finally:
    if 'conn' in locals() and conn.open:
        conn.close()
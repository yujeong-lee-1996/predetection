import pymysql
conn = pymysql.connect(host="127.0.0.1", port=3307,
                       user="appuser", password="P@ssw0rd!", database="predictions_db")
with conn.cursor() as c:
    c.execute("SELECT DATABASE(), CURRENT_USER()")
    print(c.fetchall())
print("OK")

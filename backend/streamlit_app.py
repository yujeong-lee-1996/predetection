import pandas as pd
import matplotlib.pyplot as plt
import streamlit as st
import requests

LABEL = {0: "nomal", 1: "caution", 2: "warning", 3: "critical"}
COLOR = {0: "#82b872ff", 1: "#fff677ff", 2: "#ffaa64ff", 3: "#fc5d5dff"}

url = "http://localhost:8000/facility/status/daily"

st.markdown("""
<style>
    .stApp {
            background-color:#f5f5f5ff}
</style>
""", unsafe_allow_html=True)

# API 호출
res = requests.get(url, timeout=10)
res.raise_for_status()
payload = res.json()

# payload 모양에 따라 df 만들기
if isinstance(payload, dict) and "data" in payload:
    df = pd.DataFrame(payload["data"])
elif isinstance(payload, list):
    df = pd.DataFrame(payload)
else:
    st.error(f"Unexpected response: {payload}")
    st.stop()

# 컬럼 정리
# 응답이 date, alert_level, cnt 인지 확인하고 없으면 중단
required = {"date", "alert_level", "cnt"}
if not required.issubset(df.columns):
    st.error(f"Missing columns. got={list(df.columns)} expected>={list(required)}")
    st.stop()

df["date"] = pd.to_datetime(df["date"]).dt.date
df["alert_level"] = pd.to_numeric(df["alert_level"], errors="coerce").fillna(-1).astype(int)
df["label"] = df["alert_level"].map(LABEL).fillna("기타")
df["cnt"] = pd.to_numeric(df["cnt"], errors="coerce").fillna(0).astype(int)

# 피벗 + 색상 안정화
pivot_df = df.pivot(index="date", columns="label", values="cnt").fillna(0).astype(int)
order = [0, 1, 2, 3]
cols   = [LABEL[i] for i in order if LABEL[i] in pivot_df.columns]
colors = [COLOR[i] for i in order if LABEL[i] in pivot_df.columns]
pivot_df = pivot_df.reindex(columns=cols, fill_value=0)

# 차트
fig, ax = plt.subplots(figsize=(8, 4))
fig.patch.set_facecolor("#f5f5f5")  
ax.set_facecolor("#ffffff")  
pivot_df.plot(kind="bar", stacked=True, color=colors, ax=ax)
ax.set_xlabel("date"); ax.set_ylabel("data"); ax.legend(title="status")
plt.xticks(rotation=45)
st.pyplot(fig)

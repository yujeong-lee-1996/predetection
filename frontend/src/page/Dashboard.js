import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "../component/Sidebar";
import Panel from "../component/Panel"
import api from "../api/axiosInstance"
import { useNavigate } from "react-router-dom";
import RatioPie from "../component/RatioPie";

export default function StreamlitPanel() {
  const navigate = useNavigate();
  const src =
    // process.env.REACT_APP_ST_URL ||
    "http://localhost:8502/?embed=true";
  const [allCount, setAllCount] = useState()
  const [nomalCount, setNomalCount] = useState()
  const [cautionCount, setCautionCount] = useState()
  const [warningCount, setWarningCount] = useState()
  const [criticalCount, setCriticalCount] = useState()
  const [criticalList, setCriticalList] = useState([]);
  const [loading, setLoading] = useState(false);
  const getCriticalList = async () => {
    setLoading(true)
    try {
      const response = await api.get(`/facility/list/critical`)
      setCriticalList(response?.facilities ?? {});
      console.log("response", response);
    } catch (error) {
      console.log('[api]', api.defaults.baseURL);
      console.log('[url]', '/facility/list/critical');
      console.error("심각 리스트 불러오기 실패", error)
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    getCriticalList();
  }, []);
  const getFacilityCount = async () => {
    try {
      const res = await api.get(`/facility/count`);
      setAllCount(res.count)
    } catch (error) {
      console.error("총 개수 불러오기 실패", error)
    }
  }

  const getNomalCount = async () => {
    try {
      const res = await api.get(`/prediction/count/nomal`);
      setNomalCount(res.count)
    } catch (error) {
      console.error("nomal 개수 불러오기 실패", error)
    }
  }
  const getCautionCount = async () => {
    try {
      const res = await api.get(`/prediction/count/caution`);
      setCautionCount(res.count)
    } catch (error) {
      console.error("caution 개수 불러오기 실패", error)
    }
  }
  const getWarningCount = async () => {
    try {
      const res = await api.get(`/prediction/count/warning`);
      setWarningCount(res.count)
    } catch (error) {
      console.error("warning 개수 불러오기 실패", error)
    }
  }
  const getCriticalCount = async () => {
    try {
      const res = await api.get(`/prediction/count/critical`);
      setCriticalCount(res.count)
    } catch (error) {
      console.error("critical 개수 불러오기 실패", error)
    }
  }
  useEffect(() => {
    getFacilityCount();
    getNomalCount();
    getCautionCount();
    getWarningCount();
    getCriticalCount();
  }, [getFacilityCount, getNomalCount, getCautionCount, getWarningCount, getCriticalCount]);
  const menu = [
    { text: "홈", path: "/" },
    { text: "설비 목록", path: "/list" },
    { text: "About", path: "/about" },
  ];

  return (
    <div style={{ display: "flex", height: "100%", fontFamily: "sans-serif" }}>
      {/* 여기서만 Sidebar 보이게 */}
      <Sidebar items={menu} title="예시 사이드바" width={220} />

      {/* 본문 */}
      <main style={{ flex: 1, padding: 12, paddingTop: 8 }}>
        <Panel />
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ width: "19%", height: '130px', backgroundColor: "#d9d9d9", borderRadius: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '15px' }}>
              <span style={{ fontSize: '18px' }}>전체 설비</span>
              <span style={{ fontSize: '28px', marginTop: '14px' }}>{allCount}</span>
              <span style={{ fontSize: '12px' }}>개 모니터링 중</span>
            </div>
          </div>
          <div style={{ width: "19%", height: '130px', backgroundColor: "#E7F6EA", borderRadius: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '15px' }}>
              <span style={{ fontSize: '18px' }}>정상 설비</span>
              <span style={{ fontSize: '28px', marginTop: '14px' }}>{nomalCount}</span>
              <span style={{ fontSize: '12px' }}>정상작동 중</span>
            </div>
          </div>
          <div style={{ width: "19%", height: '130px', backgroundColor: "#FFFAE6", borderRadius: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '15px' }}>
              <span style={{ fontSize: '18px' }}>주의 설비</span>
              <span style={{ fontSize: '28px', marginTop: '14px' }}>{cautionCount}</span>
              <span style={{ fontSize: '12px' }}>주의 관찰 필요</span>
            </div>
          </div>
          <div style={{ width: "19%", height: '130px', backgroundColor: "#ffecd7ff", borderRadius: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '15px' }}>
              <span style={{ fontSize: '18px' }}>경고 설비</span>
              <span style={{ fontSize: '28px', marginTop: '14px' }}>{warningCount}</span>
              <span style={{ fontSize: '12px' }}>주의 관찰 필요</span>
            </div>
          </div>
          <div style={{ width: "19%", height: '130px', backgroundColor: "#ffc7c7ff", borderRadius: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', padding: '15px' }}>
              <span style={{ fontSize: '18px' }}>심각 설비</span>
              <span style={{ fontSize: '28px', marginTop: '14px' }}>{criticalCount}</span>
              <span style={{ fontSize: '12px' }}>즉시 점검 필요</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: 'row', justifyContent: 'space-between', marginTop: "15px" }}>
          <div style={{ display: "flex", flexDirection: 'column', width: '49%' }}>
            <span style={{ fontSize: '20px', marginBottom: '8px' }}>심각 설비 목록</span>
            <div style={{ display: "flex", flexDirection: "column", height: "200px", border: "none", borderRadius: "15px", padding: '10px', backgroundColor: "#f5f5f5ff", gap: 4, overflowY: 'auto', }}>
              {criticalList.length === 0 && !loading ? (
                <span>심각한 설비가 없습니다.</span>
              ) : (
                criticalList.map((f) => {
                  return (
                    <>
                      <div key={f.faility_id} style={{ display: 'flex', justifyContent: "space-between", borderBottom: '1px solid #c2c2c2ff', paddingBlock: '4px' }}>
                        <span>{f.name}</span>
                        <button onClick={() => navigate(`/detail/${f.facility_id}`)} style={{
                          width: '60px', height: '24px', border: 'none', fontSize: '12px',
                          backgroundColor: '#636363', color: 'white', borderRadius: 10, letterSpacing: '1px', cursor: 'pointer'
                        }}>
                          상세
                        </button>
                      </div>
                    </>
                  )
                })
              )}

            </div>
          </div>
          <div style={{ display: "flex", flexDirection: 'column', width: '49%' }}>
            <span style={{ fontSize: '20px', marginBottom: '8px' }}>상태 비율</span>
            <div style={{ height: "200px", border: "none", borderRadius: "15px", padding: '10px', backgroundColor: "#f5f5f5ff" }}>
              <RatioPie />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: 'column', width: '100%', marginTop: '15px' }}>
          <span style={{ fontSize: '20px', marginBottom: '8px' }}>일별 상태 비율</span>
          <div style={{ border: "none", borderRadius: "15px", padding: '10px', backgroundColor: "#f5f5f5ff" }}>
            <iframe
              title="streamlit"
              src={src}
              style={{
                width: "100%",
                height: "500px",
                border: 0,
                // borderRadius: '15px',
                display: "block",
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
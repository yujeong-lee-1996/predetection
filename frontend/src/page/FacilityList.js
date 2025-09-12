import React, { useState, useEffect } from "react";
import Sidebar from "../component/Sidebar";
import Panel from "../component/Panel"
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"
import ReactPaginate from "react-paginate";

export default function FacilityList() {
    const navigate = useNavigate();
    const src =
        // process.env.REACT_APP_ST_URL ||
        "http://localhost:8501/?embed=true";
    const menu = [
        { text: "홈", path: "/" },
        { text: "Streamlit", path: "/streamlit" },
        { text: "About", path: "/about" },
    ];
    const [currentPage, setCurrentPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [facilityList, setFacilityList] = useState([]);
    const [loading, setLoading] = useState(false);
    const getFacilityList = async (page = 1) => {
        setLoading(true);
        try {
            const response = await api.get(`/facility/list`, { params: { page } });
            const data = response?.data ?? response;
            setFacilityList(Array.isArray(data?.facilities) ? data.facilities : []);
            setPageCount(Number(data?.totalPages ?? 1));
            console.log("response", response);

        } catch (error) {
            console.log('[API]', api.defaults.baseURL);
            console.log('[URL]', '/facility/list');
            console.error("설비 리스트 불러오기 실패", error)
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => {
        getFacilityList(currentPage);
    }, [currentPage]);

    const handlePageChange = (e) => {
        setCurrentPage(e.selected + 1);
    };
    useEffect(() => {
        if (currentPage > pageCount) {
            setCurrentPage(Math.max(1, pageCount));
        }
    }, [pageCount])
    //페이지 네이션
    function Pagination({ currentPage, pageCount, onChange }) {
        const btnStyle = (active, disabled) => ({
            padding: "6px 12px",
            margin: "0 4px",
            borderRadius: 8,
            border: "1px solid #e2b08fe7",
            cursor: disabled ? "default" : "pointer",
            background: active ? "#E2B640" : "white",
            color: active ? "#fff" : "#973700ff",
            fontWeight: active ? "bold" : "normal",
            opacity: disabled ? 0.5 : 1,
        });

        const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

        return (
            <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 24 }}>
                <button
                    style={btnStyle(false, currentPage === 1)}
                    onClick={() => currentPage > 1 && onChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    {"<"}
                </button>

                {pages.map((p) => (
                    <button
                        key={p}
                        style={btnStyle(p === currentPage, false)}
                        onClick={() => onChange(p)}
                    >
                        {p}
                    </button>
                ))}

                <button
                    style={btnStyle(false, currentPage === pageCount)}
                    onClick={() => currentPage < pageCount && onChange(currentPage + 1)}
                    disabled={currentPage === pageCount}
                >
                    {">"}
                </button>
            </div>
        );
    }
    return (
        <div style={{ display: "flex", height: "100%", fontFamily: "sans-serif" }}>
            {/* 여기서만 Sidebar 보이게 */}
            <Sidebar items={menu} title="예시 사이드바" width={220} />

            {/* 본문 */}
            <main style={{ flex: 1, padding: 12, paddingTop: 8 }}>
                <Panel />
                {/* <iframe
            title="streamlit"
            src={src}
            style={{
              width: "100%",
              height: "760px",
              border: 0,
              // borderRadius: '15px',
              display: "block",
            }}
          /> */}
                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginInline: '10px' }}>
                    <p style={{ fontSize: '24px', margin: 0 }}>설비 목록</p>
                    <button onClick={() => navigate(`/register`)} style={{
                        width: '80px', height: '30px', border: 'none', fontSize: '16px',
                        backgroundColor: '#E2B640', color: 'white', borderRadius: 10, letterSpacing: '1px', cursor: 'pointer'
                    }} >
                        등록
                    </button>
                </div>
                <div>
                    <table style={{ width: '97%', margin: '30px 20px', }}>
                        <thead>
                            <tr>
                                <th style={{ borderBottom: '1px solid #d8d8d8ff', width: '10%', letterSpacing: '1px' }}>ID</th>
                                <th style={{ borderBottom: '1px solid #d8d8d8ff', width: '40%', letterSpacing: '1px' }}>이름</th>
                                <th style={{ borderBottom: '1px solid #d8d8d8ff', width: '30%', letterSpacing: '1px' }}>위치</th>
                                <th style={{ borderBottom: '1px solid #d8d8d8ff', width: '10%', letterSpacing: '1px' }}>상태</th>
                                <th style={{ borderBottom: '1px solid #d8d8d8ff', width: '10%', letterSpacing: '1px' }}>상세</th>
                            </tr>
                        </thead>
                        <tbody>
                            {facilityList.length === 0 && !loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: "center", padding: 16 }}>
                                        등록된 설비가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                facilityList.map((f) => {

                                    return (

                                        <tr key={f.facility_id} style={{ height: '35px', }}>
                                            <td style={{ textAlign: 'center', width: '10%' }}>{f.facility_id}</td>
                                            <td style={{ textAlign: 'center', width: '40%' }}>{f.name}</td>
                                            <td style={{ textAlign: 'center', width: '30%' }}>{f.location}</td>
                                            <td style={{ textAlign: 'center', width: '10%', textAlign: "center", verticalAlign: "middle" }}>
                                                <div style={{
                                                    backgroundColor: f.status === 0 ? '#CDEDCD' : f.status === 1 ? '#d9d9d9' : f.status === 2 ? '#FFF2BC' : f.status === 3 ? "#FFDBDB" : 'white',
                                                    color: f.status === 0 ? '#004B02' : f.status === 1 ? '#5c5c5cff' : f.status === 2 ? '#B97E00' : f.status === 3 ? "#CD0000" : 'white',
                                                    width: '70%', borderRadius: '15px', margin: "auto",
                                                }}>{f.status === 0 ? "정상" : f.status === 1 ? "주의" : f.status === 2 ? "경고" : f.status === 3 ? "심각" : "오류"}</div>
                                            </td>
                                            <td style={{ textAlign: 'center', width: '10%' }}>
                                                <button onClick={() => navigate(`/detail/${f.facility_id}`)} style={{
                                                    width: '60px', height: '28px', border: 'none', fontSize: '14px',
                                                    backgroundColor: '#8b8b8bff', color: 'white', borderRadius: 10, letterSpacing: '1px', cursor: 'pointer'
                                                }}>
                                                    상세
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                }
                                ))}

                        </tbody>
                    </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <Pagination
                        currentPage={currentPage}
                        pageCount={pageCount}
                        onChange={(p) => setCurrentPage(p)}
                    />
                </div>
            </main>
        </div>
    );
}
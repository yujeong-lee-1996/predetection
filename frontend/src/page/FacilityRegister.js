import React, { useRef, useState } from "react";
import Sidebar from "../component/Sidebar";
import Panel from "../component/Panel"
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from "react-router-dom";
import api from "../api/axiosInstance"

export default function FacilityRegister() {
  const BASE_URL = process.env.REACT_APP_API_URL;
  const navigate = useNavigate();

  const menu = [
    { text: "홈", path: "/" },
    { text: "설비 목록", path: "/list" },
  ];
  const [formData, setFormData] = useState({
    facilityName: "",
    facilityType: "",
    facilityManufacturer: "",
    facilityLocation: "",
    facilityInstallDate: "",
    facilityLastInspection: "",
    facilityNextInspection: "",
  })
  const onChange = (key) => (e) =>
    setFormData((s) => ({ ...s, [key]: e.target.value }));
  const handleSubmit = async () => {
    if (!formData.facilityName || !formData.facilityType || !formData.facilityManufacturer || !formData.facilityLocation || !formData.facilityInstallDate) {
      return alert('필수 항목은 모두 입력해주세요.')
    }
    if (formData.facilityInstallDate || formData.facilityLastInspection ||formData.facilityNextInspection) {
      const today = new Date();

      if (formData.facilityInstallDate && new Date(formData.facilityInstallDate) > today) {
        return alert("설치 일자는 미래 날짜로 선택할 수 없습니다.");
      }
      if (formData.facilityLastInspection && new Date(formData.facilityLastInspection) > today) {
        return alert("마지막 점검 일자는 미래 날짜로 선택할 수 없습니다.");
      }
      if (formData.facilityNextInspection && new Date(formData.facilityNextInspection) < today) {
        return alert("다음 점검 일자는 과거 날짜로 선택할 수 없습니다.");
      }
    }
    try {
      const response = await api.post(`/facility/register`, formData,)
      alert("설비가 등록되었습니다.")
      navigate("/list")
    } catch (error) {
      console.error("설비 등록 실패:", error);
      alert("설비 등록에 실패하였습니다.");
    }
  };
  return (
    <div style={{ display: "flex", height: "100%", fontFamily: "sans-serif" }}>
      {/* 여기서만 Sidebar 보이게 */}
      <Sidebar items={menu} title="예시 사이드바" width={220} />

      {/* 본문 */}
      <main style={{ flex: 1, padding: 12, paddingTop: 8 }}>
        <Panel />
        <p style={{ fontSize: '24px', marginInline: '10px', marginTop: 0 }}>설비 등록</p>
        <div style={{ display: "flex", justifyContent: 'center' }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', backgroundColor: '#f5f5f5', paddingBlock: '30px', borderRadius: '20px', marginBottom: '10px' }}>
            <div style={{ width: '80%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <p>설비 이름<span style={{ color: 'red' }}>*</span></p>
              <input value={formData.facilityName} onChange={onChange("facilityName")} style={{ height: '34px', width: '500px', border: '1px solid #d9d9d9', borderRadius: '15px', paddingInline: '10px' }}></input>
            </div>
            <div style={{ width: '80%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <p>설비 종류<span style={{ color: 'red' }}>*</span></p>
              <input value={formData.facilityType} onChange={onChange("facilityType")} style={{ height: '34px', width: '500px', border: '1px solid #d9d9d9', borderRadius: '15px', paddingInline: '10px' }}></input>
            </div>
            <div style={{ width: '80%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <p>설비 제조사<span style={{ color: 'red' }}>*</span></p>
              <input value={formData.facilityManufacturer} onChange={onChange("facilityManufacturer")} style={{ height: '34px', width: '500px', border: '1px solid #d9d9d9', borderRadius: '15px', paddingInline: '10px' }}></input>
            </div>
            <div style={{ width: '80%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <p>설비 위치<span style={{ color: 'red' }}>*</span></p>
              <input value={formData.facilityLocation} onChange={onChange("facilityLocation")} style={{ height: '34px', width: '500px', border: '1px solid #d9d9d9', borderRadius: '15px', paddingInline: '10px' }}></input>
            </div>
            <div style={{ width: '80%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <p>설비 설치 일자<span style={{ color: 'red' }}>*</span></p>
              <input type='date' value={formData.facilityInstallDate} onChange={onChange("facilityInstallDate")} style={{ height: '34px', width: '500px', border: '1px solid #d9d9d9', borderRadius: '15px', paddingInline: '10px' }}></input>
            </div>
            <div style={{ width: '80%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <p>설비 마지막 점검 일자</p>
              <input type='date' value={formData.facilityLastInspection} onChange={onChange("facilityLastInspection")} style={{ height: '34px', width: '500px', border: '1px solid #d9d9d9', borderRadius: '15px', paddingInline: '10px' }}></input>
            </div>
            <div style={{ width: '80%', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <p>설비 다음 점검 일자</p>
              <input type='date' value={formData.facilityNextInspection} onChange={onChange("facilityNextInspection")} style={{ height: '34px', width: '500px', border: '1px solid #d9d9d9', borderRadius: '15px', paddingInline: '10px' }}></input>
            </div>
            <button onClick={handleSubmit} style={{ width: '120px', height: '40px', border: 'none', borderRadius: '15px', backgroundColor: '#E2B640', fontSize: '16px', letterSpacing: '1px', cursor: 'pointer' , color:'white'}}>저장</button>
          </div>
        </div>
      </main>
    </div>
  );
}
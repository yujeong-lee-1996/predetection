import React, { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "../component/Sidebar";
import Panel from "../component/Panel"
import Drawer from "../component/Drawer";
import { useNavigate, useParams } from "react-router-dom";
import { VscWarning, VscSymbolProperty, VscCalendar } from "react-icons/vsc";
import { SlLocationPin } from "react-icons/sl";
import { IoClose } from "react-icons/io5";
import api from "../api/axiosInstance"


export default function FacilityDetail() {
  const { id: facility_id } = useParams();
  const [info, setInfo] = useState(null);

  const toDateInput = (v) => {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v).slice(0, 10); // 이미 'YYYY-MM-DD'면 그대로
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };
  const src = useMemo(() => {
    const base = "http://localhost:8501/?embed=true";
    return `${base}&facility_id=${encodeURIComponent(facility_id)}`;
  }, [facility_id]);

  const navigate = useNavigate();

  const menu = [
    { text: "홈", path: "/" },
    { text: "설비 목록", path: "/list" },
    { text: "About", path: "/about" },
  ];

  useEffect(() => {
    if (facility_id) {
      getFacilityInfo(facility_id);
    }
  }, [facility_id]);

  const getFacilityInfo = async (facility_id) => {
    try {
      const data = await api.get(`/facility/info/${facility_id}`);
      console.log("✅ data:", data);
      console.log("✅ facility:", data.facility);
      setInfo(data.facility);
      console.log("data", data.facility);
    } catch (error) {
      console.error("설비 정보 불러오기 실패", error)
    }
  }
  const handleDeleteFacility = async (facility_id) => {
    try {
      const data = await api.get(`/facility/delete/${facility_id}`);
      alert("설비가 삭제되었습니다.")
      navigate("/list")
    } catch (error) {
      console.error("설비 삭제 실패", error)
    }
  }
  const openDeleteConfirm = () => {
    if (!facility_id) return alert("설비 ID가 없습니다.");
    if (window.confirm("삭제하시겠습니까?")) {
      handleDeleteFacility(facility_id);
    } else {
    }
  };
  // const [closeModal, setCloseModal]=useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    type: "",
    manufacturer: "",
    location: "",
    install_date: "",
    last_inspection: "",
    next_inspection: "",
  });
  const openEdit = () => {
    if (!info) return;
    setEditForm({
      name: info.name ?? "",
      type: info.type ?? "",
      manufacturer: info.manufacturer ?? "",
      location: info.location ?? "",
      install_date: toDateInput(info.install_date),
      last_inspection: toDateInput(info.last_inspection),
      next_inspection: toDateInput(info.next_inspection),
    });
    setEditModalOpen(true);
  };
  const handleUpdateFacility = async () => {
    if(!editForm.name || !editForm.type || !editForm.manufacturer || !editForm.location || !editForm.install_date){
      return alert('필수 항목은 모두 입력해주세요.')
    }
    if (editForm.install_date || editForm.last_inspection ||editForm.next_inspection) {
      const today = new Date();

      if (editForm.install_date && new Date(editForm.install_date) > today) {
        return alert("설치 일자는 미래 날짜로 선택할 수 없습니다.");
      }
      if (editForm.last_inspection && new Date(editForm.last_inspection) > today) {
        return alert("마지막 점검 일자는 미래 날짜로 선택할 수 없습니다.");
      }
      if (editForm.next_inspection && new Date(editForm.next_inspection) < today) {
        return alert("마지막 점검 일자는 미래 날짜로 선택할 수 없습니다.");
      }
    }
    try {
      const payload = {
        name: editForm.name,
        type: editForm.type,
        manufacturer: editForm.manufacturer,
        location: editForm.location,
        install_date: editForm.install_date || null,
        last_inspection: editForm.last_inspection || null,
        next_inspection: editForm.next_inspection || null,
      };
      const res = await api.put(`facility/update/${facility_id}`, payload);
      setInfo((prev) => ({ ...(prev ?? {}), ...payload }));
      setEditModalOpen(false);
      alert("설비 정보가 수정되었습니다.");
    } catch (e) {
      console.error("설비 수정 실패", e);
      alert("수정에 실패했습니다.");
    }
  };


  // 데이터 업데이트 드로우
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formData, setFormData] = useState({
    누적전력량: "",
    유효전력평균: "",
    무효전력평균: "",
    주파수: "",
    전류평균: "",
    상전압평균: "",
    선간전압평균: "",
    온도: "",
    R상유효전력: "",
    R상무효전력: "",
    R상전류: "",
    R상전압: "",
    R상선간전압: "",
    S상유효전력: "",
    S상무효전력: "",
    S상전류: "",
    S상전압: "",
    S상선간전압: "",
    T상유효전력: "",
    T상무효전력: "",
    T상전류: "",
    T상전압: "",
    T상선간전압: "",
  });

  const onChange = (k, v) => setFormData((s) => ({ ...s, [k]: v }));
  const isBlank = (v) => v === null || v === undefined || String(v).trim() === "";
  const isNumericStrict = (v) => /^-?\d+(\.\d+)?$/.test(String(v).trim());
  const required = [
    "누적전력량", "유효전력평균", "무효전력평균", "주파수", "전류평균",
    "상전압평균", "선간전압평균", "온도",
    "R상유효전력", "R상무효전력", "R상전류", "R상전압", "R상선간전압",
    "S상유효전력", "S상무효전력", "S상전류", "S상전압", "S상선간전압",
    "T상유효전력", "T상무효전력", "T상전류", "T상전압", "T상선간전압",
  ];

  const handleSubmit = async () => {
    try {
      if (!facility_id) {
        alert("설비 ID가 없습니다.");
        return;
      }
      //빈칸 체크
      const missing = required.filter((k) => isBlank(formData[k]));
      if (missing.length) {
        alert(`모두 입력해주세요:\n- ${missing.join("\n- ")}`);
        return;
      }
      //숫자 체크
      const notNumeric = required.filter(
        (k) => !isBlank(formData[k]) && !isNumericStrict(formData[k])
      );
      if (notNumeric.length) {
        alert(`숫자만 입력 가능한 항목입니다:\n- ${notNumeric.join("\n- ")}`);
        return;
      }
      const cleaned = Object.fromEntries(
        Object.entries(formData).map(([k, v]) => [k, isBlank(v) ? null : Number(v)])
      );
      const payload = { facility_id: Number(facility_id), ...cleaned };
      const response = await api.post(`/prediction/data`, payload)
      alert("데이터가 업데이트 되었습니다.")
      console.log("submit payload:", payload);
      setDrawerOpen(false);
      window.location.reload();
    } catch (error) {
      console.error("데이터 업데이트 실패:", error);

      alert("데이터 업데이트에 실패하였습니다.");
    }
  };
  useEffect(() => {
    if (editModalOpen || drawerOpen) {
      document.body.style.overflow = "hidden";  // 스크롤 잠금
    } else {
      document.body.style.overflow = "";        // 기본으로 되돌림
    }
    return () => {
      document.body.style.overflow = "";        // 컴포넌트 언마운트 시도 복원
    };
  }, [editModalOpen, drawerOpen]);

  return (
    <>
      {/* 정보 업데이트 모달 */}
      {editModalOpen && (
        <div
          onClick={() => setEditModalOpen(true)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()} // 내부 클릭은 유지
            style={{
              width: 520, maxWidth: '92%',
              background: '#fff', borderRadius: 12,
              boxShadow: '0 10px 30px rgba(0,0,0,.2)',
              padding: 18
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontWeight: 600 }}>정보 수정</span>
              <button
                onClick={() => setEditModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <IoClose style={{ fontSize: '30px', color:'#E2B640' }} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <label>설비 이름<span style={{ color: 'red' }}>*</span></label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm(s => ({ ...s, name: e.target.value }))}
                style={{ height: '30px', border: '1px solid #e2e2e2ff', borderRadius: '10px', paddingInline: '10px' }} />

              <label>설비 종류<span style={{ color: 'red' }}>*</span></label>
              <input
                value={editForm.type}
                onChange={(e) => setEditForm(s => ({ ...s, type: e.target.value }))}
                style={{ height: '30px', border: '1px solid #e2e2e2ff', borderRadius: '10px', paddingInline: '10px' }} />

              <label>설비 제조사<span style={{ color: 'red' }}>*</span></label>
              <input
                value={editForm.manufacturer}
                onChange={(e) => setEditForm(s => ({ ...s, manufacturer: e.target.value }))}
                style={{ height: '30px', border: '1px solid #e2e2e2ff', borderRadius: '10px', paddingInline: '10px' }} />

              <label>설비 위치<span style={{ color: 'red' }}>*</span></label>
              <input
                value={editForm.location}
                onChange={(e) => setEditForm(s => ({ ...s, location: e.target.value }))}
                style={{ height: '30px', border: '1px solid #e2e2e2ff', borderRadius: '10px', paddingInline: '10px' }} />

              <label>설비 설치 일자<span style={{ color: 'red' }}>*</span></label>
              <input
                value={editForm.install_date}
                onChange={(e) => setEditForm(s => ({ ...s, install_date: e.target.value }))}
                type="date" style={{ height: '30px', border: '1px solid #e2e2e2ff', borderRadius: '10px', paddingInline: '10px' }} />

              <label>마지막 점검 일자</label>
              <input
                value={editForm.last_inspection}
                onChange={(e) => setEditForm(s => ({ ...s, last_inspection: e.target.value }))}
                type="date" style={{ height: '30px', border: '1px solid #e2e2e2ff', borderRadius: '10px', paddingInline: '10px' }} />

              <label>다음 점검 일자</label>
              <input
                value={editForm.next_inspection}
                onChange={(e) => setEditForm(s => ({ ...s, next_inspection: e.target.value }))}
                type="date" style={{ height: '30px', border: '1px solid #e2e2e2ff', borderRadius: '10px', paddingInline: '10px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {/* 초기화 로직 */ }}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff' }}
              >
                초기화
              </button>
              <button
                type="button"
                onClick={handleUpdateFacility}
                style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#E2B640', color: '#fff' }}
              >
                수정
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", height: "100%", fontFamily: "sans-serif" }}>
        {/* 여기서만 Sidebar 보이게 */}
        <Sidebar items={menu} title="예시 사이드바" width={220} />

        {/* 본문 */}
        <main style={{ flex: 1, padding: 12, paddingTop: 8 }}>
          <Panel />

          <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', marginInline: '10px' }}>
            <p style={{ fontSize: '24px', marginInline: '10px', marginTop: 0 }}>설비 상세 ·&nbsp;
              {info?.name ?? '...'}
            </p>
            <button onClick={openDeleteConfirm} style={{
              width: '80px', height: '30px', border: 'none', fontSize: '16px', cursor: 'pointer',
              backgroundColor: '#BF3434', color: 'white', borderRadius: 10, letterSpacing: '1px', fontWeight: '400'
            }} >
              삭제
            </button>
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#f0f0f0ff', borderRadius: '15px' }}>
            <div style={{ width: '96%', height: '32px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: '10px 10px 0px 15px' }}>
              <p style={{ margin: 0 }}>
                {info?.name ?? '...'}
              </p>
              <button onClick={openEdit} style={{ fontSize: '12px', color: '#a3a3a3ff', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}>
                수정
              </button>
            </div>
            <p style={{ fontSize: "14px", color: '#a3a3a3ff', margin: '0px 0px 15px 15px' }}>
              {info?.type ?? '-'} · {info?.manufacturer ?? '-'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: '#ffffffff', width: '22%', margin: '0px 10px 10px 10px', padding: '10px 10px 10px 15px', borderRadius: '15px', alignItems: 'center' }}>
                <SlLocationPin style={{ fontSize: '30px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '20px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#818181ff' }}>설치 위치</p>
                  <p style={{ margin: 0 }}>
                    {info?.location ?? '-'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: '#ffffffff', width: '22%', margin: '0px 10px 10px 10px', padding: '10px 10px 10px 15px', borderRadius: '15px', alignItems: 'center' }}>
                <VscCalendar style={{ fontSize: '30px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '20px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#818181ff' }}>설치 일자</p>
                  <p style={{ margin: 0 }}>
                    {info?.install_date ?? '-'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: '#ffffffff', width: '22%', margin: '0px 10px 10px 10px', padding: '10px 10px 10px 15px', borderRadius: '15px', alignItems: 'center' }}>
                <VscSymbolProperty style={{ fontSize: '30px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '20px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#818181ff' }}>마지막 점검일</p>
                  <p style={{ margin: 0 }}>
                    {info?.last_inspection ?? '-'}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', backgroundColor: '#ffffffff', width: '22%', margin: '0px 10px 10px 10px', padding: '10px 10px 10px 15px', borderRadius: '15px', alignItems: 'center' }}>
                <VscWarning style={{ fontSize: '30px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', marginLeft: '20px' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: '#818181ff' }}>다음 점검</p>
                  <p style={{ margin: 0 }}>
                    {info?.next_inspection ?? '-'}
                  </p>
                </div>
              </div>



            </div>
            <div>

            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'end', marginTop: '10px', paddingRight: '10px' }}>
            <button onClick={() => setDrawerOpen(true)} style={{ width: '120px', height: '30px', fontSize: '16px', color: '#ffffffff', border: 'none', backgroundColor: '#E2B640', borderRadius: '10px', fontWeight: '400', cursor: 'pointer' }}>
              예측 업데이트
            </button>
          </div>
          <iframe
            title="streamlit"
            key={facility_id}
            src={src}
            style={{
              width: "100%",
              height: "1150px",
              border: 0,
              borderRadius: '15px',
              display: "block",
              // border: '1px solid #d9d9d9'
            }}
          />
          {/* <div style={{ width: '98%', display: 'flex', flexDirection: 'column', marginInline: '10px', backgroundColor: '#f0f0f0ff', borderRadius: '15px', marginTop: '8px' }}>
            <div style={{ width: '96%', height: '32px', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: '10px 10px 0px 15px' }}>
              <p style={{ margin: 0 }}>최근 데이터
                {/* ${f.name} */}
              {/* </p>  */}
              {/* <button onClick={() => setDrawerOpen(true)} style={{ width: '80px', height: '30px', fontSize: '16px', color: '#ffffffff', border: 'none', backgroundColor: '#E2B640', borderRadius: '10px', fontWeight: '400',cursor:'pointer' }}>
                업데이트
              </button> */}
            {/* </div>
            <div style={{ display: 'flex', gap: '0px', flexDirection: 'column', paddingInline: '80px', marginLeft: '70px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', }}>
                <div style={{ display: 'flex', width: '30%' }}>
                  <p style={{ margin: 0 }}>주파수:Hz</p>

                </div>
                <div style={{ display: 'flex', width: '30%' }}>
                  <p style={{ margin: 0 }}>전류 평균:A</p>

                </div>
                <div style={{ display: 'flex', width: '30%' }}>
                  <p style={{ margin: 0 }}>상전압평균:V</p>

                </div>
              </div>
              <div style={{ display: 'flex', }}>
                <div style={{ display: 'flex', width: '30%' }}>
                  <p style={{ margin: 0 }}>온도:°C</p>

                </div>
                <div style={{ display: 'flex', width: '30%' }}>
                  <p style={{ margin: 0 }}>전류 THD:%</p>

                </div>
                <div style={{ display: 'flex', width: '30%' }}>
                  <p style={{ margin: 0 }}>전압:%</p>

                </div>
              </div>
              <div style={{ display: 'flex', width: '30%' }}>
                <p style={{ margin: 0 }}>역률:</p>
              </div>
            </div>
          </div> */}


          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="데이터 업데이트"
            width={440}
            closeOnBackdrop={false}

            footer={
              <>
                <button
                  type="button"
                  onClick={() =>
                    setFormData(Object.fromEntries(Object.keys(formData).map((k) => [k, ""])))
                  }
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #ddd",
                    background: "#fff",
                    cursor: 'pointer'
                  }}
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: "#E2B640",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  적용&저장
                </button>
              </>
            }
          >
            {/* 폼 그리드 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                rowGap: 10,
              }}
            >
              {Object.keys(formData).map((label) => (
                <div key={label} style={{ display: "grid", rowGap: 6 }}>
                  <label style={{ fontSize: 12, color: "#666" }}>{label}</label>
                  <input
                    value={formData[label]}
                    onChange={(e) => onChange(label, e.target.value)}
                    placeholder={`${label} 입력`}
                    style={{
                      height: 36,
                      borderRadius: 8,
                      border: "1px solid #ddd",
                      padding: "0 10px",
                      outline: "none",
                    }}
                  />
                </div>
              ))}
            </div>
          </Drawer>
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
        </main>
      </div>
    </>
  );
}
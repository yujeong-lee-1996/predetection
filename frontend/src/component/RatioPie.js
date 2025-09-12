// StatusRatioCard.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api/axiosInstance";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
ChartJS.register(ArcElement, Tooltip, Legend);

const LABEL = { 0: "정상", 1: "주의", 2: "경고", 3: "심각" };
const COLOR = { 0: "#82b872ff", 1: "#fff677ff", 2: "#ffaa64ff", 3: "#fc5d5dff" };

// 중앙 합계 텍스트 플러그인 (선택)
const centerText = {
  id: "centerText",
  afterDraw(chart, args, opts) {
    const { ctx, chartArea } = chart;
    const total = chart.data.datasets?.[0]?.data?.reduce((a,b)=>a+Number(b||0),0) || 0;
    if (!total) return;
    const cx = (chartArea.left + chartArea.right) / 2;
    const cy = (chartArea.top + chartArea.bottom) / 2;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#111";
    ctx.font = "700 16px system-ui, sans-serif";
    ctx.fillText(total.toLocaleString(), cx, cy - 6);
    ctx.fillStyle = "#666";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("총 설비", cx, cy + 12);
    ctx.restore();
  }
};

export default function StatusRatioCard() {
  const [ratio, setRatio] = useState([]);   // [{level, count}]
  const [loading, setLoading] = useState(false);

  const getStatusCount = async () => {
    setLoading(true);
    try {
      // axios 인터셉터가 response.data만 반환 → 이 값이 곧 JSON
      const data = await api.get("/prediction/status/count");
      const list = Array.isArray(data?.countsByLevel) ? data.countsByLevel : [];
      setRatio(list);
    } catch (e) {
      console.error("status 비율 불러오기 실패", e);
      setRatio([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { getStatusCount(); }, []);

  const labels = useMemo(
    () => [0,1,2,3].map(l => LABEL[l]),
    []
  );
  const values = useMemo(() => {
    const map = new Map(ratio.map(r => [Number(r.level), Number(r.count)||0]));
    return [0,1,2,3].map(l => map.get(l) || 0);
  }, [ratio]);
  const colors = useMemo(() => [0,1,2,3].map(l => COLOR[l]), []);

  const total = values.reduce((a,b)=>a+b,0);

  if (loading) {
    return <div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center"}}>불러오는 중…</div>;
  }
  if (!total) {
    return <div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center"}}>데이터 없음</div>;
  }

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: colors,
      borderColor: "#fff",
      borderWidth: 1,
    }],
  };

  const options = {
    maintainAspectRatio: false,
    cutout: "60%",                 // 도넛 두께
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const v = Number(ctx.parsed) || 0;
            const p = total ? Math.round((v/total)*100) : 0;
            return ` ${ctx.label}: ${v.toLocaleString()} (${p}%)`;
          }
        }
      }
    }
  };

  return (
      <Doughnut data={data} options={options} plugins={[centerText]} />

  );
}

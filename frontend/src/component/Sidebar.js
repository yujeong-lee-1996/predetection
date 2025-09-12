import React from "react";
import { NavLink, Outlet } from "react-router-dom";

export default function SidebarLayout() {
  const menu = [
    { text: "홈", path: "/" },
    { text: "설비 목록", path: "/list" },
    { text: "설비 등록", path: "/register" },
  ];

  return (
    <div style={{ 
      display: "flex",
      minHeight:'100vh',  
      backgroundColor:"#f1f1f1ff", 
      // borderRadius:'10px',
      }}>
      <aside style={{ width: 140, borderRight: "1px solid #eee", padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>메뉴</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {menu.map((m) => (
            <li key={m.path} style={{ marginBottom: 8 }}>
              <NavLink
                to={m.path}
                style={({ isActive }) => ({
                  display: "block",
                  padding: "8px 10px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: isActive ? 700 : 400,
                  background: isActive ? "#ffffffff" : "transparent",
                  color: "#111827",
                })}
                end={m.path === "/"}
              >
                {m.text}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>

      {/* <main style={{ flex: 1, padding: 24 }}>
        <Outlet />
      </main> */}
    </div>
  );
}

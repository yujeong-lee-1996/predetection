import React, { useEffect, useRef } from "react";
import { IoClose } from "react-icons/io5";

export default function Drawer({
    open,
  title = "데이터 업데이트",
  children,
  onClose,
  width = 420,
  footer,
  closeOnEsc=true,
  closeOnBackdrop = true,
}){
    const panelRef=useRef(null);

     useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (closeOnEsc && e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, closeOnEsc]);

if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={closeOnBackdrop ? onClose : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(100%, " + width + "px)",
          height: "100%",
          background: "#fff",
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-6px 0 24px rgba(0,0,0,.18)",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <strong style={{ fontSize: 16 }}>{title}</strong>
          <button
            onClick={onClose}
            aria-label="닫기"
            style={{ border: "none", background: "transparent", cursor: "pointer" }}
          >
            <IoClose size={22} />
          </button>
        </div>

        {/* 본문(스크롤) */}
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>{children}</div>

        {/* 푸터 */}
        {footer && (
          <div
            style={{
              padding: 12,
              borderTop: "1px solid #eee",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
            }}
          >
            {footer}
          </div>
        )}
      </aside>
    </div>
  );
}
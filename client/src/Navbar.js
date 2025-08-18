import React from "react";

function Navbar({ onToggleDarkMode }) {
  return (
    <>
      {/* Dark Mode Button - top-right */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 999,
        }}
      >
        <button
          onClick={onToggleDarkMode}
          style={{
            padding: "6px 10px",
            fontSize: "10px",
            backgroundColor: "#333",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            width: "auto",          // ✅ Prevent full width
            display: "inline-block" // ✅ Prevent stretching
          }}
        >
          Dark Mode
        </button>
      </div>
    </>
  );
}

export default Navbar;

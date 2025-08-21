import React, { useState } from "react";

function Navbar({ onToggleDarkMode, userProfile, session, onShowProfile, onLogout, onShowMyRepositories, onShowUploadForm }) {
  const [showMenu, setShowMenu] = useState(false);

  const toggleMenu = () => {
    setShowMenu(!showMenu);
  };

  const handleMenuClick = (action) => {
    setShowMenu(false);
    action();
  };

  return (
    <>
      {/* Overlay to close menu when clicking outside */}
      {showMenu && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
            background: "transparent"
          }}
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Hamburger Menu - top-left */}
      {session && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "20px",
            zIndex: 1000,
          }}
        >
          <button
            onClick={toggleMenu}
            className="hamburger-menu"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "18px",
              cursor: "pointer",
              padding: "8px",
              borderRadius: "4px",
              color: "#333"
            }}
            title="Menu"
          >
            ☰
          </button>
          
          {/* Full-height Sidebar Menu */}
          {showMenu && (
            <div
              className="dropdown-menu"
              style={{
                position: "fixed",
                top: "0",
                left: "0",
                bottom: "0",
                backgroundColor: "white",
                border: "none",
                borderRadius: "0",
                boxShadow: "2px 0 16px rgba(0,0,0,0.15)",
                width: "280px",
                zIndex: 1001,
                padding: "0",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Close X button */}
              <div style={{ 
                padding: "20px", 
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "flex-end"
              }}>
                <button
                  onClick={() => setShowMenu(false)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "#666",
                    padding: "5px",
                    lineHeight: "1"
                  }}
                  title="Close menu"
                >
                  ×
                </button>
              </div>
              
              {/* Menu items */}
              <div style={{ flex: 1, padding: "0" }}>
                <button
                  onClick={() => handleMenuClick(onShowMyRepositories)}
                  className="menu-item"
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    fontSize: "15px",
                    fontWeight: "500"
                  }}
                >
                  My Repositories
                </button>
                
                <button
                  onClick={() => handleMenuClick(onShowUploadForm)}
                  className="menu-item"
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                    fontSize: "15px",
                    fontWeight: "500"
                  }}
                >
                  Upload New Repository
                </button>
                
                <button
                  onClick={() => handleMenuClick(onShowProfile)}
                  className="menu-item"
                  style={{
                    width: "100%",
                    padding: "16px 24px",
                    border: "none",
                    background: "transparent",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: "500"
                  }}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dark Mode and Logout Buttons - top-right */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 999,
          display: "flex",
          gap: "10px",
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
            width: "auto",
            display: "inline-block"
          }}
        >
          Dark Mode
        </button>
        {session && onLogout && (
          <button
            onClick={onLogout}
            style={{
              padding: "6px 10px",
              fontSize: "10px",
              backgroundColor: "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              width: "auto",
              display: "inline-block"
            }}
            title="Log Out"
          >
            Log Out
          </button>
        )}
      </div>
    </>
  );
}

export default Navbar;

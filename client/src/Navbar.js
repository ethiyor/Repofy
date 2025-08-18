import React from "react";

function Navbar({ onToggleDarkMode, userProfile, session, onShowProfile }) {
  // Get display name with fallbacks
  const getDisplayName = () => {
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.username) return userProfile.username;
    if (session?.user?.user_metadata?.username) return session.user.user_metadata.username;
    return session?.user?.email?.split("@")[0] || "User";
  };

  return (
    <>
      {/* User Profile - top-left */}
      {session && (
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 999,
          }}
        >
          <div 
            className="navbar-profile clickable-profile" 
            onClick={onShowProfile}
            title="Click to view profile"
          >
            <div 
              className="profile-avatar" 
              style={{ 
                marginRight: "8px",
                backgroundImage: userProfile?.avatar_url ? `url(${userProfile.avatar_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {!userProfile?.avatar_url && getDisplayName().charAt(0).toUpperCase()}
            </div>
            <div className="profile-text">
              <span className="profile-name">{getDisplayName()}</span>
            </div>
          </div>
        </div>
      )}

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
            width: "auto",
            display: "inline-block"
          }}
        >
          Dark Mode
        </button>
      </div>
    </>
  );
}

export default Navbar;

import React, { useState, useEffect } from "react";

function Navbar({ onToggleDarkMode, userProfile, session, onShowProfile, onLogout, onShowMyRepositories, onShowUploadForm }) {
  const [showMenu, setShowMenu] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  // Get profile picture URL from any available source
  const getProfilePictureUrl = () => {
    // Debug logging
    console.log('Getting profile picture URL:', {
      userProfile_avatar: userProfile?.avatar_url,
      userProfile_profile_picture: userProfile?.profile_picture,
      session_avatar: session?.user?.user_metadata?.avatar_url,
      session_picture: session?.user?.user_metadata?.picture,
      session_profile_picture: session?.user?.user_metadata?.profile_picture
    });

    if (userProfile?.avatar_url) return userProfile.avatar_url;
    if (userProfile?.profile_picture) return userProfile.profile_picture;
    if (session?.user?.user_metadata?.avatar_url) return session.user.user_metadata.avatar_url;
    if (session?.user?.user_metadata?.picture) return session.user.user_metadata.picture;
    if (session?.user?.user_metadata?.profile_picture) return session.user.user_metadata.profile_picture;
    return null;
  };

  const profileImageUrl = getProfilePictureUrl();

  // Reset image error when profile image URL changes
  useEffect(() => {
    setProfileImageError(false);
  }, [profileImageUrl]);

  // Debug profile picture sources
  console.log('Profile Picture Debug:', {
    userProfile: userProfile,
    session: session?.user,
    profileImageUrl: profileImageUrl,
    imageError: profileImageError
  });

  const toggleMenu = () => {
    const newShowMenu = !showMenu;
    setShowMenu(newShowMenu);
    
    // Prevent/allow scrolling on body when menu is open/closed
    if (newShowMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  };

  const handleMenuClick = (action) => {
    setShowMenu(false);
    document.body.style.overflow = ''; // Restore scrolling
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
          onClick={() => {
            setShowMenu(false);
            document.body.style.overflow = ''; // Restore scrolling
          }}
        />
      )}

      {/* Hamburger Menu and Logo - very top-left corner */}
      {session && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            left: "10px",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <button
            onClick={toggleMenu}
            className="hamburger-menu"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "22px",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "4px",
              color: "#333",
              lineHeight: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            title="Menu"
          >
            ☰
          </button>
          
          {/* Repofy Logo */}
          <button
            onClick={() => {
              // Navigate to dashboard/community - you'll need to implement this navigation
              window.location.href = '/';
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#007bff",
              fontSize: "24px",
              fontWeight: "bold",
              padding: "6px",
              transition: "all 0.3s ease",
              outline: "none",
              lineHeight: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => {
              e.target.style.color = "#0056b3";
              e.target.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.target.style.color = "#007bff";
              e.target.style.transform = "scale(1)";
            }}
            onMouseDown={(e) => {
              e.target.style.transform = "scale(0.95)";
              e.target.style.color = "#004085";
            }}
            onMouseUp={(e) => {
              e.target.style.transform = "scale(1.1)";
              e.target.style.color = "#0056b3";
            }}
            title="Go to Dashboard"
          >
            R
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
                width: "200px",
                zIndex: 1001,
                padding: "0",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Close X button - positioned at top-right corner */}
              <div style={{ 
                position: "relative",
                height: "60px",
                borderBottom: "1px solid #eee"
              }}>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    document.body.style.overflow = ''; // Restore scrolling
                  }}
                  style={{
                    position: "absolute",
                    top: "15px",
                    right: "15px",
                    background: "transparent",
                    border: "none",
                    fontSize: "24px",
                    cursor: "pointer",
                    color: "#666",
                    padding: "5px",
                    lineHeight: "1",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
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
              
              {/* Dark Mode and Logout buttons at bottom */}
              <div style={{ 
                borderTop: "1px solid #eee",
                padding: "0"
              }}>
                <button
                  onClick={() => handleMenuClick(onToggleDarkMode)}
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
                  Dark Mode
                </button>
                
                {onLogout && (
                  <button
                    onClick={() => handleMenuClick(onLogout)}
                    className="menu-item"
                    style={{
                      width: "100%",
                      padding: "16px 24px",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      fontSize: "15px",
                      fontWeight: "500",
                      color: "#dc3545"
                    }}
                  >
                    Log Out
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Profile Button - top-right */}
      <div
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        {session && onShowProfile && (
          <>
            <span
              style={{
                fontSize: "14px",
                fontWeight: "500",
                color: "#333",
                cursor: "pointer"
              }}
              onClick={onShowProfile}
              title="Click to view profile"
            >
              {userProfile?.display_name || userProfile?.username || session?.user?.email?.split("@")[0] || "User"}
            </span>
            <button
              onClick={onShowProfile}
              style={{
                padding: "0",
                width: "40px",
                height: "40px",
                backgroundColor: "transparent",
                border: "2px solid #007bff",
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
              title="User Profile"
            >
            {!profileImageError && profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="Profile"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%"
                }}
                onError={(e) => {
                  console.log('Profile image failed to load:', e.target.src);
                  setProfileImageError(true);
                }}
                onLoad={() => {
                  console.log('Profile image loaded successfully:', profileImageUrl);
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#007bff",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "bold"
                }}
              >
                {(userProfile?.display_name?.[0] || userProfile?.username?.[0] || session?.user?.email?.[0] || 'U').toUpperCase()}
              </div>
            )}
          </button>
          </>
        )}
      </div>
    </>
  );
}

export default Navbar;

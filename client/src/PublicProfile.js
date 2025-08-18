import React from "react";
import "./App.css";

function PublicProfile({ userProfile, onBack }) {
  console.log("PublicProfile component received userProfile:", userProfile);
  
  const getInitials = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const displayName = userProfile?.display_name || userProfile?.username || "User";
  console.log("Display name:", displayName);

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <button onClick={onBack} className="btn-secondary back-btn">
          ← Back to Repositories
        </button>
        <h2>User Profile</h2>
      </div>

      <div className="profile-content">
        <div className="profile-info-section">
          <div className="profile-avatar-large">
            {getInitials(displayName)}
          </div>
          
          <div className="profile-details">
            <h3>{displayName}</h3>
            {userProfile?.username && userProfile.username !== displayName && (
              <p className="profile-username-large">@{userProfile.username}</p>
            )}
            
            {userProfile?.bio && <p className="profile-bio">{userProfile.bio}</p>}
            
            <div className="profile-meta">
              {userProfile?.location && (
                <span className="profile-location">📍 {userProfile.location}</span>
              )}
              {userProfile?.website && (
                <a 
                  href={userProfile.website.startsWith('http') ? userProfile.website : `https://${userProfile.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="profile-website"
                >
                  🔗 Website
                </a>
              )}
            </div>

            {userProfile?.email?.endsWith(".edu") && (
              <div className="edu-badge">Verified .EDU Account</div>
            )}
          </div>
        </div>

        <div className="public-profile-info">
          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-label">Repositories</span>
              <span className="stat-value">{userProfile?.repo_count || 0}</span>
            </div>
          </div>
        </div>

        {!userProfile?.bio && !userProfile?.location && !userProfile?.website && (
          <div className="empty-profile">
            <p>This user hasn't added any additional information to their profile yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicProfile;

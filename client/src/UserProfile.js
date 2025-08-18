import React, { useState, useEffect } from "react";
import "./App.css";

// Use environment-based URLs
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://repofy-backend.onrender.com' 
  : 'http://localhost:4000';

function UserProfile({ session, userProfile, setUserProfile, onBack }) {
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    display_name: "",
    bio: "",
    website: "",
    location: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || "",
        display_name: userProfile.display_name || "",
        bio: userProfile.bio || "",
        website: userProfile.website || "",
        location: userProfile.location || ""
      });
    }
  }, [userProfile]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setUserProfile(data);
      setEditMode(false);
      setMessage("✅ Profile updated successfully!");
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      // This would need to be implemented in the backend
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete account");
      }

      setMessage("✅ Account deletion initiated. You will be logged out.");
      // The actual logout would be handled by the parent component
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return session.user.email?.charAt(0).toUpperCase() || "U";
    return name.charAt(0).toUpperCase();
  };

  const displayName = userProfile?.display_name || userProfile?.username || session.user.email?.split("@")[0] || "User";

  return (
    <div className="user-profile-container">
      <div className="profile-header">
        <button onClick={onBack} className="btn-secondary back-btn">
          ← Back to Dashboard
        </button>
        <h2>User Profile</h2>
      </div>

      {message && <div className="status-message">{message}</div>}

      <div className="profile-content">
        <div className="profile-info-section">
          <div className="profile-avatar-large">
            {getInitials(displayName)}
          </div>
          
          <div className="profile-details">
            <h3>{displayName}</h3>
            <p className="profile-email">{session.user.email}</p>
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

            {session.user.email.endsWith(".edu") && (
              <div className="edu-badge">Verified .EDU Account</div>
            )}
          </div>
        </div>

        <div className="profile-actions">
          {!editMode ? (
            <>
              <button 
                onClick={() => setEditMode(true)} 
                className="btn-primary"
              >
                Edit Profile
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="btn-danger"
              >
                Delete Account
              </button>
            </>
          ) : (
            <div className="edit-profile-form">
              <h3>Edit Profile</h3>
              
              <label><strong>Username</strong></label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder="Enter username"
                pattern="[a-zA-Z0-9_-]+"
                title="Username can only contain letters, numbers, underscores, and hyphens"
              />

              <label><strong>Display Name</strong></label>
              <input
                type="text"
                name="display_name"
                value={formData.display_name}
                onChange={handleInputChange}
                placeholder="Enter display name"
              />

              <label><strong>Bio</strong></label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself"
                rows={3}
              />

              <label><strong>Website</strong></label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://yourwebsite.com"
              />

              <label><strong>Location</strong></label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="City, Country"
              />

              <div className="edit-actions">
                <button 
                  onClick={handleSaveProfile} 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Changes"}
                </button>
                <button 
                  onClick={() => {
                    setEditMode(false);
                    setMessage("");
                    // Reset form data
                    if (userProfile) {
                      setFormData({
                        username: userProfile.username || "",
                        display_name: userProfile.display_name || "",
                        bio: userProfile.bio || "",
                        website: userProfile.website || "",
                        location: userProfile.location || ""
                      });
                    }
                  }} 
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {showDeleteConfirm && (
          <div className="delete-confirm-modal">
            <div className="modal-content">
              <h3>⚠️ Delete Account</h3>
              <p>
                Are you sure you want to delete your account? This action cannot be undone.
                All your repositories and data will be permanently deleted.
              </p>
              <div className="modal-actions">
                <button 
                  onClick={handleDeleteAccount} 
                  className="btn-danger"
                  disabled={loading}
                >
                  {loading ? "Deleting..." : "Yes, Delete My Account"}
                </button>
                <button 
                  onClick={() => setShowDeleteConfirm(false)} 
                  className="btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;

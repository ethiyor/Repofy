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
    location: "",
    avatar_url: ""
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        username: userProfile.username || "",
        display_name: userProfile.display_name || "",
        bio: userProfile.bio || "",
        website: userProfile.website || "",
        location: userProfile.location || "",
        avatar_url: userProfile.avatar_url || ""
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

  const compressImage = (file, maxWidth = 300, maxHeight = 300, quality = 0.7) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setMessage("❌ Please select an image file");
      return;
    }

    // Validate file size (max 5MB for original file)
    if (file.size > 5 * 1024 * 1024) {
      setMessage("❌ Original image size must be less than 5MB");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      // Compress the image first
      const compressedFile = await compressImage(file);
      
      // Convert compressed image to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;

        try {
          const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ avatar_data: base64Data }),
          });

          const data = await response.json();

          if (!response.ok) {
            if (response.status === 413) {
              throw new Error("Image too large. Please choose a smaller image.");
            }
            throw new Error(data.error || "Failed to upload avatar");
          }

          setUserProfile(data);
          setMessage("✅ Profile picture updated successfully!");
        } catch (error) {
          setMessage("❌ " + error.message);
        } finally {
          setUploading(false);
        }
      };

      reader.readAsDataURL(compressedFile);
    } catch (error) {
      setMessage("❌ " + error.message);
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          ...formData,
          avatar_url: null 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove avatar");
      }

      setUserProfile(data);
      setMessage("✅ Profile picture removed successfully!");
    } catch (error) {
      setMessage("❌ " + error.message);
    } finally {
      setUploading(false);
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
          <div className="avatar-container">
            <div 
              className="profile-avatar-large clickable-avatar" 
              onClick={() => document.getElementById('avatar-upload').click()}
              title="Click to upload profile picture"
              style={{
                backgroundImage: userProfile?.avatar_url ? `url(${userProfile.avatar_url})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                cursor: 'pointer',
                position: 'relative'
              }}
            >
              {!userProfile?.avatar_url && getInitials(displayName)}
              {!uploading && !userProfile?.avatar_url && (
                <div className="camera-hint">📷</div>
              )}
              {uploading && (
                <div className="upload-overlay">
                  <span>⏳</span>
                </div>
              )}
            </div>
            {userProfile?.avatar_url && (
              <button 
                className="remove-avatar-btn"
                onClick={handleRemoveAvatar}
                title="Remove profile picture"
                disabled={uploading}
              >
                ✕
              </button>
            )}
          </div>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
          
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
                        location: userProfile.location || "",
                        avatar_url: userProfile.avatar_url || ""
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

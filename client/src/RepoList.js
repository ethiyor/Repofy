import React, { useState } from "react";
import "./App.css";

// Use environment-based URLs
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://repofy-backend.onrender.com' 
  : 'http://localhost:4000';

function RepoList({ session, repos, setRepos, onStar, onDownload, onShowProfile, onShowUserProfile }) {
  const [loadingRepoId, setLoadingRepoId] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});
  const [showComments, setShowComments] = useState({});
  const [expandedRepos, setExpandedRepos] = useState({});

  // Group repositories by user
  const groupedRepos = repos.reduce((acc, repo) => {
    const userKey = repo.user_id;
    if (!acc[userKey]) {
      acc[userKey] = {
        user_id: repo.user_id,
        username: repo.username,
        display_name: repo.display_name,
        repos: []
      };
    }
    acc[userKey].repos.push(repo);
    return acc;
  }, {});

  // Separate current user's repos from others
  const currentUserRepos = groupedRepos[session.user.id] || { 
    repos: [], 
    user_id: session.user.id, 
    display_name: session.user.email?.split('@')[0] || 'Your Account',
    username: session.user.email?.split('@')[0] || 'your-account'
  };
  const otherUsersRepos = Object.values(groupedRepos).filter(user => user.user_id !== session.user.id);

  // Sort other users by username
  const sortedOtherUsers = otherUsersRepos.sort((a, b) => 
    a.display_name.localeCompare(b.display_name)
  );

  // Handle profile click - show profile for current user, public profile for others
  const handleProfileClick = (user, isCurrentUser) => {
    console.log("Profile clicked:", user.display_name, "isCurrentUser:", isCurrentUser);
    
    if (isCurrentUser) {
      console.log("Calling onShowProfile for current user");
      onShowProfile(); // Navigate to full profile page for current user
    } else {
      if (onShowUserProfile) {
        console.log("Calling onShowUserProfile with userId:", user.user_id);
        onShowUserProfile(user.user_id); // Show public profile for other users
      } else {
        console.error("onShowUserProfile function not available");
      }
    }
  };

  // Render user section component
  const renderUserSection = (user, isCurrentUser = false) => (
    <div key={user.user_id} className="user-section">
      <div className="user-header">
        <h3 className="user-title">
          <div 
            className="profile-info clickable-profile" 
            onClick={() => handleProfileClick(user, isCurrentUser)}
            title={isCurrentUser ? "Click to view your profile" : `View ${user.display_name}'s profile`}
          >
            <div className="profile-avatar">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <span className="profile-name">{user.display_name}</span>
            {user.username && user.username !== user.display_name && (
              <span className="profile-username">@{user.username}</span>
            )}
          </div>
          {isCurrentUser && (
            <span className="your-repos-badge">Your Repositories</span>
          )}
        </h3>
        <span className="repo-count">
          {user.repos.length} {user.repos.length === 1 ? 'repository' : 'repositories'}
        </span>
      </div>
      
      <div className="user-repos">
        {user.repos.map((repo) => (
          <div key={repo.id} className={`repo-card ${expandedRepos[repo.id] ? 'expanded' : 'collapsed'}`}>
            <div className="repo-header" onClick={() => toggleRepoExpansion(repo.id)} style={{ cursor: 'pointer' }}>
              <div className="repo-title-section">
                <h4>{repo.name}</h4>
                <div className="repo-meta">
                  {repo.is_public ? (
                    <span className="public-badge">Public</span>
                  ) : (
                    <span className="private-badge">Private</span>
                  )}
                </div>
              </div>
              <div className="expand-indicator">
                {expandedRepos[repo.id] ? '▼' : '▶'}
              </div>
            </div>
            
            <div className="repo-description" onClick={() => toggleRepoExpansion(repo.id)} style={{ cursor: 'pointer' }}>
              <p>
                {expandedRepos[repo.id] 
                  ? repo.description 
                  : truncateDescription(repo.description)
                }
              </p>
            </div>

            {expandedRepos[repo.id] && (
              <>
                {repo.tags && repo.tags.length > 0 && (
                  <div className="tag-container">
                    {repo.tags.map((tag, index) => (
                      <span key={index} className="tag-badge">#{tag}</span>
                    ))}
                  </div>
                )}

                {/* Show files immediately when expanded */}
                <div className="file-list">
                  {loadingRepoId === repo.id ? (
                    <p>Loading files...</p>
                  ) : repo.files && repo.files.length > 0 ? (
                    repo.files.map((file) => (
                      <div key={file.id} className="file-block">
                        <div className="file-header">
                          <strong>{file.name}</strong>
                          <div>
                            <button className="btn-small" onClick={() => onDownload(file)}>Download</button>
                            <button className="btn-small" disabled>Edit</button>
                          </div>
                        </div>
                        <pre className="file-content">{file.content}</pre>
                      </div>
                    ))
                  ) : (
                    <p>No files found in this repository.</p>
                  )}
                </div>

                {/* Action buttons moved below file content */}
                <div className="repo-actions">
                  <button className="btn-star" onClick={() => onStar(repo.id)}>
                    Star {repo.stars || 0}
                  </button>
                  {repo.user_id === session.user.id && (
                    <button className="btn-danger" onClick={() => deleteRepo(repo.id)}>
                      Delete
                    </button>
                  )}
                  <button className="btn-secondary" onClick={() => toggleComments(repo.id)}>
                    {showComments[repo.id] ? "Hide Comments" : "Comments"}
                  </button>
                </div>
              </>
            )}

            {expandedRepos[repo.id] && showComments[repo.id] && (
              <div className="comment-section">
                <textarea
                  placeholder="Leave a comment..."
                  value={commentTexts[repo.id] || ""}
                  onChange={(e) =>
                    setCommentTexts({ ...commentTexts, [repo.id]: e.target.value })
                  }
                />
                <button 
                  className="btn-primary" 
                  onClick={() => submitComment(repo.id)}
                  disabled={!commentTexts[repo.id] || commentTexts[repo.id].trim() === ''}
                >
                  Submit Comment
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const toggleFiles = async (repoId) => {
    const updatedRepos = [...repos];
    const repoIndex = updatedRepos.findIndex((r) => r.id === repoId);
    const repo = updatedRepos[repoIndex];

    if (!repo.showFiles) {
      setLoadingRepoId(repoId);
      try {
        const res = await fetch(`${API_BASE_URL}/repos/${repoId}/files`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const files = await res.json();
          repo.files = files;
        } else {
          console.error("Failed to load files");
          repo.files = [];
        }
      } catch (err) {
        console.error("Error fetching files:", err);
        repo.files = [];
      }
      setLoadingRepoId(null);
    }

    repo.showFiles = !repo.showFiles;
    updatedRepos[repoIndex] = repo;
    setRepos(updatedRepos);
  };

  const deleteRepo = async (repoId) => {
    const confirmed = window.confirm("Are you sure you want to delete this repository?");
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/repos/${repoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const updatedRepos = repos.filter((r) => r.id !== repoId);
        setRepos(updatedRepos);
      } else {
        console.error("Failed to delete repo");
      }
    } catch (err) {
      console.error("Error deleting repo:", err);
    }
  };

  const toggleComments = (repoId) => {
    setShowComments(prev => ({
      ...prev,
      [repoId]: !prev[repoId]
    }));
  };

  const toggleRepoExpansion = async (repoId) => {
    const newExpandedState = !expandedRepos[repoId];
    setExpandedRepos(prev => ({
      ...prev,
      [repoId]: newExpandedState
    }));

    // If expanding and files haven't been loaded yet, load them automatically
    if (newExpandedState) {
      const repo = repos.find(r => r.id === repoId);
      if (repo && !repo.showFiles) {
        setLoadingRepoId(repoId);
        try {
          const res = await fetch(`${API_BASE_URL}/repos/${repoId}/files`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (res.ok) {
            const files = await res.json();
            const updatedRepos = [...repos];
            const repoIndex = updatedRepos.findIndex((r) => r.id === repoId);
            updatedRepos[repoIndex] = {
              ...updatedRepos[repoIndex],
              files: files,
              showFiles: true
            };
            setRepos(updatedRepos);
          } else {
            console.error("Failed to load files");
          }
        } catch (err) {
          console.error("Error fetching files:", err);
        }
        setLoadingRepoId(null);
      }
    }
  };

  const truncateDescription = (description, maxWords = 10) => {
    if (!description) return '';
    const words = description.split(' ');
    if (words.length <= maxWords) return description;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  const submitComment = (repoId) => {
    const commentText = commentTexts[repoId];
    if (!commentText || commentText.trim() === '') {
      alert('Please enter a comment before submitting.');
      return;
    }
    
    // TODO: Implement actual comment submission to backend
    alert('Comment functionality coming soon!');
    
    // Clear the comment text after submission
    setCommentTexts(prev => ({
      ...prev,
      [repoId]: ''
    }));
  };

  if (!session) return null;

  return (
    <div className="repo-list">
      <h2>Repository Collection</h2>
      <p>Explore our curated collection of code repositories</p>

      <div className="repositories-container">
        {/* Left Column - Current User's Repos */}
        <div className="user-repos-column">
          <div className="column-header">
            <h2>Your Repositories</h2>
          </div>
          {currentUserRepos.repos.length > 0 ? (
            renderUserSection(currentUserRepos, true)
          ) : (
            <div className="empty-state">
              <p>Start by uploading your first repository!</p>
            </div>
          )}
        </div>

        {/* Right Column - Other Users' Repos */}
        <div className="other-repos-column">
          <div className="column-header">
            <h2>Community Repositories</h2>
          </div>
          {sortedOtherUsers.length > 0 ? (
            sortedOtherUsers.map((userGroup) => 
              renderUserSection(userGroup, false)
            )
          ) : (
            <div className="empty-state">
              <p>No community repositories yet!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RepoList;

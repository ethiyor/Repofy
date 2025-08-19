import React, { useState } from "react";
import AdvancedSearch from "./components/AdvancedSearch";
import Analytics from "./components/Analytics";
import "./App.css";

// Use environment-based URLs
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://repofy-backend.onrender.com' 
  : 'http://localhost:4000';

function RepoList({ session, userProfile, repos, setRepos, onStar, onDownload, onShowProfile, onShowUserProfile, onShowMyRepositories }) {
  const [loadingRepoId, setLoadingRepoId] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});
  const [showComments, setShowComments] = useState({});
  const [expandedRepos, setExpandedRepos] = useState({});
  const [filteredRepos, setFilteredRepos] = useState(repos);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'

  // Update filtered repos when repos change
  React.useEffect(() => {
    setFilteredRepos(repos);
  }, [repos]);

  // Group repositories by user
  const groupedRepos = filteredRepos.reduce((acc, repo) => {
    const userKey = repo.user_id;
    if (!acc[userKey]) {
      acc[userKey] = {
        user_id: repo.user_id,
        username: repo.username,
        display_name: repo.display_name,
        avatar_url: repo.avatar_url,
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
    display_name: userProfile?.display_name || session.user.email?.split('@')[0] || 'Your Account',
    username: userProfile?.username || session.user.email?.split('@')[0] || 'your-account',
    avatar_url: userProfile?.avatar_url || null
  };
  
  // If current user has repos, update their profile data with latest from userProfile
  if (groupedRepos[session.user.id]) {
    currentUserRepos.display_name = userProfile?.display_name || currentUserRepos.display_name;
    currentUserRepos.username = userProfile?.username || currentUserRepos.username;
    currentUserRepos.avatar_url = userProfile?.avatar_url || currentUserRepos.avatar_url;
  }
  const otherUsersRepos = Object.values(groupedRepos).filter(user => user.user_id !== session.user.id);

  // Sort other users by username
  const sortedOtherUsers = otherUsersRepos.sort((a, b) => 
    a.display_name.localeCompare(b.display_name)
  );

  const toggleRepoFiles = async (repoId) => {
    setLoadingRepoId(repoId);
    
    const repo = filteredRepos.find(r => r.id === repoId);
    if (!repo) return;

    if (repo.showFiles) {
      // Hide files
      setRepos(prevRepos => 
        prevRepos.map(r => 
          r.id === repoId 
            ? { ...r, showFiles: false, files: [] }
            : r
        )
      );
    } else {
      // Fetch and show files
      try {
        const res = await fetch(`${API_BASE_URL}/repos/${repoId}/files`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          const files = await res.json();
          setRepos(prevRepos => 
            prevRepos.map(r => 
              r.id === repoId 
                ? { ...r, showFiles: true, files }
                : r
            )
          );
        } else {
          window.notify?.error("Failed to fetch files");
        }
      } catch (err) {
        window.notify?.error("Error fetching files");
      }
    }
    
    setLoadingRepoId(null);
  };

  const handleStarRepo = async (repoId) => {
    await onStar(repoId);
  };

  const toggleComments = (repoId) => {
    setShowComments(prev => ({
      ...prev,
      [repoId]: !prev[repoId]
    }));
  };

  const toggleRepoExpansion = (repoId) => {
    setExpandedRepos(prev => ({
      ...prev,
      [repoId]: !prev[repoId]
    }));
  };

  const handleCommentChange = (repoId, value) => {
    setCommentTexts(prev => ({
      ...prev,
      [repoId]: value
    }));
  };

  const submitComment = async (repoId) => {
    const commentText = commentTexts[repoId];
    if (!commentText?.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/repos/${repoId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: commentText }),
      });

      if (res.ok) {
        setCommentTexts(prev => ({
          ...prev,
          [repoId]: ""
        }));
        window.notify?.success("Comment added successfully!");
        // Refresh repo data to show new comment
        // This would require updating the repos state with the new comment
      } else {
        window.notify?.error("Failed to add comment");
      }
    } catch (err) {
      window.notify?.error("Error adding comment");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return formatDate(dateString);
  };

  const RepoCard = ({ repo, isCurrentUser = false }) => (
    <div className={`repo-card ${viewMode === 'list' ? 'repo-card-list' : ''} ${expandedRepos[repo.id] ? 'expanded' : ''}`}>
      <div className="repo-header">
        <div className="repo-title-section">
          <h3 className="repo-title">
            {repo.name}
            {repo.is_public ? (
              <span className="visibility-badge public">Public</span>
            ) : (
              <span className="visibility-badge private">Private</span>
            )}
          </h3>
          <p className="repo-description">{repo.description}</p>
        </div>
        <div className="repo-meta">
          <span className="repo-date" title={formatDate(repo.created_at)}>
            {formatTimeAgo(repo.created_at)}
          </span>
          <button
            className="expand-button"
            onClick={() => toggleRepoExpansion(repo.id)}
            title={expandedRepos[repo.id] ? "Collapse" : "Expand"}
          >
            {expandedRepos[repo.id] ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {(expandedRepos[repo.id] || viewMode === 'list') && (
        <>
          {/* Tags */}
          {repo.tags && repo.tags.length > 0 && (
            <div className="repo-tags">
              {repo.tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          )}

          {/* Repository Stats */}
          <div className="repo-stats">
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <span>{repo.star_count || 0} stars</span>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📁</span>
              <span>{repo.files?.length || 0} files</span>
            </div>
            {repo.comment_count && (
              <div className="stat-item">
                <span className="stat-icon">💬</span>
                <span>{repo.comment_count} comments</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="repo-actions">
            <button
              onClick={() => handleStarRepo(repo.id)}
              className="btn-action star-btn"
              title="Star Repository"
            >
              ⭐ Star
            </button>
            <button
              onClick={() => toggleRepoFiles(repo.id)}
              className="btn-action files-btn"
              disabled={loadingRepoId === repo.id}
              title="View Files"
            >
              {loadingRepoId === repo.id ? "Loading..." : 
               repo.showFiles ? "Hide Files" : "View Files"}
            </button>
            <button
              onClick={() => toggleComments(repo.id)}
              className="btn-action comment-btn"
              title="Toggle Comments"
            >
              💬 {showComments[repo.id] ? "Hide" : "Show"} Comments
            </button>
          </div>

          {/* Files Section */}
          {repo.showFiles && repo.files && (
            <div className="files-section">
              <h4>Files:</h4>
              <div className="files-list">
                {repo.files.map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-name">{file.name}</span>
                    <button
                      onClick={() => onDownload(file)}
                      className="download-btn"
                      title="Download File"
                    >
                      ⬇️
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments Section */}
          {showComments[repo.id] && (
            <div className="comments-section">
              <div className="comment-input-section">
                <textarea
                  value={commentTexts[repo.id] || ""}
                  onChange={(e) => handleCommentChange(repo.id, e.target.value)}
                  placeholder="Add a comment..."
                  className="comment-input"
                  rows={3}
                />
                <button
                  onClick={() => submitComment(repo.id)}
                  className="btn-action submit-comment"
                  disabled={!commentTexts[repo.id]?.trim()}
                >
                  Add Comment
                </button>
              </div>
              {/* Existing comments would be rendered here */}
            </div>
          )}
        </>
      )}
    </div>
  );

  const UserSection = ({ userData, isCurrentUser = false }) => (
    <div className="user-section">
      <div className="user-header">
        <div className="user-info">
          {userData.avatar_url && (
            <img 
              src={userData.avatar_url} 
              alt={`${userData.display_name}'s avatar`}
              className="user-avatar"
            />
          )}
          <div className="user-details">
            <h2 className="user-name">
              {userData.display_name}
              {isCurrentUser && <span className="you-badge">You</span>}
            </h2>
            <p className="user-username">@{userData.username}</p>
            <p className="repo-count">{userData.repos.length} repositories</p>
          </div>
        </div>
        <div className="user-actions">
          {isCurrentUser ? (
            <>
              <button onClick={onShowProfile} className="btn-action profile-btn">
                Edit Profile
              </button>
              <button onClick={onShowMyRepositories} className="btn-action my-repos-btn">
                My Repositories
              </button>
            </>
          ) : (
            <button 
              onClick={() => onShowUserProfile(userData.user_id)} 
              className="btn-action view-profile-btn"
            >
              View Profile
            </button>
          )}
        </div>
      </div>
      <div className={`repos-grid ${viewMode}`}>
        {userData.repos.map(repo => (
          <RepoCard key={repo.id} repo={repo} isCurrentUser={isCurrentUser} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="repo-list-container">
      {/* Search and Filter Controls */}
      <div className="repo-list-controls">
        <AdvancedSearch 
          repos={repos} 
          onFilter={setFilteredRepos}
          className="search-section"
        />
        
        <div className="view-controls">
          <div className="view-mode-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`view-toggle ${viewMode === 'grid' ? 'active' : ''}`}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`view-toggle ${viewMode === 'list' ? 'active' : ''}`}
              title="List View"
            >
              ☰
            </button>
          </div>
          
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`analytics-toggle ${showAnalytics ? 'active' : ''}`}
            title="Toggle Analytics"
          >
            📊 Analytics
          </button>
        </div>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <Analytics repos={repos} session={session} />
      )}

      {/* Results Summary */}
      <div className="results-summary">
        <p>
          Showing {filteredRepos.length} of {repos.length} repositories
          {filteredRepos.length !== repos.length && (
            <button 
              onClick={() => setFilteredRepos(repos)}
              className="clear-filter-link"
            >
              Clear filters
            </button>
          )}
        </p>
      </div>

      {/* Repository Sections */}
      <div className="repo-sections">
        {/* Current User's Repositories */}
        {currentUserRepos.repos.length > 0 && (
          <UserSection userData={currentUserRepos} isCurrentUser={true} />
        )}

        {/* Other Users' Repositories */}
        {sortedOtherUsers.map(userData => (
          <UserSection key={userData.user_id} userData={userData} isCurrentUser={false} />
        ))}

        {/* Empty State */}
        {filteredRepos.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No repositories found</h3>
            <p>
              {repos.length === 0 
                ? "No repositories have been created yet. Start by creating your first repository!"
                : "No repositories match your current filters. Try adjusting your search criteria."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default RepoList;

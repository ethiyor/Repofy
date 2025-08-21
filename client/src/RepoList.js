import React, { useState } from "react";
import AdvancedSearch from "./components/AdvancedSearch";
import "./App.css";

// Use environment-based URLs
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://repofy-backend.onrender.com' 
  : 'http://localhost:4000';

function RepoList({ session, userProfile, repos, setRepos, onStar, onDownload, onShowProfile, onShowUserProfile, onShowMyRepositories, onShowRepositoryDetail }) {
  const [filteredRepos, setFilteredRepos] = useState(repos);

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

  // Get only other users' repositories (exclude current user)
  const otherUsersRepos = Object.values(groupedRepos).filter(user => user.user_id !== session.user.id);

  // Sort other users by username
  const sortedOtherUsers = otherUsersRepos.sort((a, b) => 
    a.display_name.localeCompare(b.display_name)
  );

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

  const RepoCard = ({ repo, isCurrentUser = false }) => {
    const handleViewClick = (e) => {
      e.stopPropagation();
      onShowRepositoryDetail(repo);
    };

    // Truncate description to 80 chars with ellipsis
    const getTruncatedDescription = (desc, maxLen = 50) => {
      if (!desc) return '';
      return desc.length > maxLen ? desc.slice(0, maxLen) + '...' : desc;
    };

    return (
      <div className="repo-card">
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
            <p className="repo-description">{getTruncatedDescription(repo.description)}</p>
          </div>
          <div className="repo-meta">
            <span className="repo-date" title={formatDate(repo.created_at)}>
              {formatTimeAgo(repo.created_at)}
            </span>
            <button 
              className="view-arrow-btn"
              onClick={handleViewClick}
              title="View Repository"
            >
              Click to view →
            </button>
          </div>
        </div>

        {/* Tags */}
        {repo.tags && repo.tags.length > 0 && (
          <div className="repo-tags">
            {repo.tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    );
  };

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
              className="view-profile-text-btn"
            >
              View Profile
            </button>
          )}
        </div>
      </div>
      <div className="repos-grid grid">
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
      </div>

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

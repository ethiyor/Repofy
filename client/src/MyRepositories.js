import React, { useState } from "react";
import Analytics from "./components/Analytics";
import "./App.css";

// Use environment-based URLs
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://repofy-backend.onrender.com' 
  : 'http://localhost:4000';

function MyRepositories({ session, repos, setRepos, onStar, onDownload, onBack, uploadRepo }) {
  const [loadingRepoId, setLoadingRepoId] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});
  const [showComments, setShowComments] = useState({});
  const [expandedRepos, setExpandedRepos] = useState({});
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  // Upload form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [code, setCode] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [message, setMessage] = useState("");

  // Filter only current user's repos
  const currentUserRepos = repos.filter(repo => repo.user_id === session.user.id);

  const toggleRepoExpansion = async (repoId) => {
    const newExpandedState = !expandedRepos[repoId];
    setExpandedRepos(prev => ({
      ...prev,
      [repoId]: newExpandedState
    }));

    // If expanding and files haven't been loaded yet, fetch them
    if (newExpandedState) {
      const repo = repos.find(r => r.id === repoId);
      if (repo && (!repo.files || repo.files.length === 0)) {
        setLoadingRepoId(repoId);
        try {
          const res = await fetch(`${API_BASE_URL}/repos/${repoId}/files`, {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (res.ok) {
            const files = await res.json();
            // Update the repo in the repos array with the loaded files
            setRepos(prevRepos => 
              prevRepos.map(r => 
                r.id === repoId ? { ...r, files: files } : r
              )
            );
          } else {
            console.error("Failed to load files");
            setRepos(prevRepos => 
              prevRepos.map(r => 
                r.id === repoId ? { ...r, files: [] } : r
              )
            );
          }
        } catch (err) {
          console.error("Error fetching files:", err);
          setRepos(prevRepos => 
            prevRepos.map(r => 
              r.id === repoId ? { ...r, files: [] } : r
            )
          );
        }
        setLoadingRepoId(null);
      }
    }
  };

  const toggleComments = (repoId) => {
    setShowComments(prev => ({
      ...prev,
      [repoId]: !prev[repoId]
    }));
  };

  const handleCommentChange = (repoId, text) => {
    setCommentTexts(prev => ({
      ...prev,
      [repoId]: text
    }));
  };

  const submitComment = async (repoId) => {
    const commentText = commentTexts[repoId];
    if (!commentText?.trim()) return;

    try {
      const response = await fetch(`${API_BASE_URL}/repos/${repoId}/comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ 
          content: commentText,
          user_id: session.user.id,
          username: session.user.email?.split('@')[0] || 'Anonymous'
        }),
      });

      if (response.ok) {
        // Clear the comment text
        setCommentTexts(prev => ({
          ...prev,
          [repoId]: ""
        }));
        
        // Refresh repos to show the new comment
        // This would need to be handled by the parent component
        // For now, just show a success message
        console.log("Comment submitted successfully");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
    }
  };

  const handleDelete = async (repoId) => {
    if (!window.confirm("Are you sure you want to delete this repository? This action cannot be undone.")) {
      return;
    }

    setLoadingRepoId(repoId);

    try {
      const response = await fetch(`${API_BASE_URL}/repos/${repoId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        // Remove the deleted repo from the list
        setRepos(repos.filter(repo => repo.id !== repoId));
      } else {
        const errorData = await response.json();
        alert("Failed to delete repository: " + errorData.error);
      }
    } catch (error) {
      console.error("Error deleting repository:", error);
      alert("Error deleting repository");
    } finally {
      setLoadingRepoId(null);
    }
  };

  const handleUploadRepo = async () => {
    if (!title.trim() || !code.trim()) {
      setMessage("❌ Please fill in at least the title and code fields.");
      return;
    }

    try {
      // Step 1: Create the repository
      const repoResponse = await fetch(`${API_BASE_URL}/repos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: title.trim(),
          description: description.trim(),
          tags: tags.trim().split(',').map(tag => tag.trim()).filter(tag => tag),
          is_public: isPublic,
        }),
      });

      const repoData = await repoResponse.json();

      if (!repoResponse.ok) {
        setMessage(`❌ Error creating repository: ${repoData.error}`);
        return;
      }

      // Step 2: Upload the file to the repository
      const fileResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: "main.txt", // Default filename, could be made configurable
          content: code.trim(),
          repo_id: repoData.id,
        }),
      });

      const fileData = await fileResponse.json();

      if (fileResponse.ok) {
        // Add the new repo to the list with the uploaded file
        const newRepo = {
          ...repoData,
          files: [fileData], // Include the uploaded file
          username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'user',
          display_name: session.user.user_metadata?.display_name || session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
          avatar_url: null // Will be loaded from profile
        };
        setRepos([newRepo, ...repos]);
        
        // Reset form
        setTitle("");
        setDescription("");
        setTags("");
        setCode("");
        setIsPublic(true);
        setShowUploadForm(false);
        setMessage("✅ Repository uploaded successfully!");
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(""), 3000);
      } else {
        setMessage(`❌ Error uploading file: ${fileData.error}`);
      }
    } catch (error) {
      setMessage("❌ Error uploading repository: " + error.message);
    }
  };

  const toggleUploadForm = () => {
    setShowUploadForm(!showUploadForm);
    setMessage("");
  };

  return (
    <div className="my-repositories-container">
      <div className="page-header">
        <button onClick={onBack} className="btn-secondary back-btn">
          ← Back to Community
        </button>
        <h1>📚 My Repositories</h1>
        
        <div className="header-actions">
          <button 
            onClick={() => setShowAnalytics(!showAnalytics)} 
            className={`btn-secondary analytics-btn ${showAnalytics ? 'active' : ''}`}
          >
            📊 {showAnalytics ? 'Hide' : 'Show'} Analytics
          </button>
          <button 
            onClick={toggleUploadForm} 
            className="btn-primary upload-btn"
          >
            ➕ {showUploadForm ? 'Cancel' : 'New Repository'}
          </button>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Analytics Section */}
      {showAnalytics && (
        <div className="analytics-section">
          <Analytics repos={currentUserRepos} session={session} />
        </div>
      )}

      {/* Upload Form */}
      {showUploadForm && (
        <div className="upload-section">
          <div className="upload-form">
            <h3>Create New Repository</h3>
            
            <div className="form-group">
              <label htmlFor="title">Repository Name *</label>
              <input
                id="title"
                type="text"
                placeholder="Enter repository name..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                placeholder="Describe your repository..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="tags">Tags (comma-separated)</label>
              <input
                id="tags"
                type="text"
                placeholder="javascript, react, nodejs..."
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="code">Code Content *</label>
              <textarea
                id="code"
                placeholder="Paste your code here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="form-input code-input"
                rows={8}
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span className="checkbox-text">Make this repository public</span>
              </label>
            </div>

            <div className="form-actions">
              <button 
                onClick={handleUploadRepo} 
                className="btn-primary"
                disabled={!title.trim() || !code.trim()}
              >
                🚀 Create Repository
              </button>
              <button 
                onClick={toggleUploadForm} 
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repository Summary */}
      <div className="repo-summary">
        <h3>Repository Overview</h3>
        <div className="summary-stats">
          <div className="stat-card">
            <span className="stat-number">{currentUserRepos.length}</span>
            <span className="stat-label">Total Repositories</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {currentUserRepos.reduce((sum, repo) => sum + (repo.star_count || 0), 0)}
            </span>
            <span className="stat-label">Total Stars</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {currentUserRepos.filter(repo => repo.is_public).length}
            </span>
            <span className="stat-label">Public Repos</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">
              {currentUserRepos.filter(repo => !repo.is_public).length}
            </span>
            <span className="stat-label">Private Repos</span>
          </div>
        </div>
      </div>

      {/* Repositories List */}
      <div className="repositories-list">
        {currentUserRepos.length > 0 ? (
          currentUserRepos.map((repo) => (
            <div key={repo.id} className={`repo-card ${expandedRepos[repo.id] ? 'expanded' : 'collapsed'}`}>
              <div className="repo-header" onClick={() => toggleRepoExpansion(repo.id)} style={{ cursor: 'pointer' }}>
                <div className="repo-title-section">
                  <h4>
                    {repo.name} 
                    {repo.is_public ? (
                      <span className="public-badge">Public</span>
                    ) : (
                      <span className="private-badge">Private</span>
                    )}
                  </h4>
                  <p className="repo-description">{repo.description}</p>
                  
                  {repo.tags && repo.tags.length > 0 && (
                    <div className="repo-tags">
                      {Array.isArray(repo.tags) ? (
                        repo.tags.map((tag, index) => (
                          <span key={index} className="tag">{tag}</span>
                        ))
                      ) : (
                        typeof repo.tags === 'string' && repo.tags.trim() && 
                        repo.tags.split(',').map((tag, index) => (
                          <span key={index} className="tag">{tag.trim()}</span>
                        ))
                      )}
                    </div>
                  )}
                </div>
                
                <div className="repo-actions">
                  <div className="repo-stats">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onStar(repo.id);
                      }}
                      className="stat-button"
                    >
                      ⭐ {repo.stars || 0}
                    </button>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(repo.id);
                      }}
                      className="stat-button"
                    >
                      📥 {repo.downloads || 0}
                    </button>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(repo.id);
                    }}
                    className="btn-danger delete-btn"
                    disabled={loadingRepoId === repo.id}
                  >
                    {loadingRepoId === repo.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>

              {expandedRepos[repo.id] && (
                <div className="repo-details">
                  {/* Show files immediately when expanded */}
                  <div className="file-list">
                    {loadingRepoId === repo.id ? (
                      <p>Loading files...</p>
                    ) : repo.files && repo.files.length > 0 ? (
                      repo.files.map((file) => (
                        <div key={file.id} className="file-block">
                          <div className="file-header">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{file.content.length} chars</span>
                          </div>
                          <pre className="code-block">
                            <code>{file.content}</code>
                          </pre>
                        </div>
                      ))
                    ) : (
                      <p>No files found in this repository.</p>
                    )}
                  </div>

                  <div className="repo-footer">
                    <div className="repo-metadata">
                      <small>
                        Created: {new Date(repo.created_at).toLocaleDateString()} | 
                        Language: {repo.language || 'Not specified'}
                      </small>
                    </div>

                    <div className="comment-section">
                      <button 
                        onClick={() => toggleComments(repo.id)}
                        className="btn-secondary"
                      >
                        {showComments[repo.id] ? 'Hide Comments' : 'Show Comments'} 
                        {repo.comments && repo.comments.length > 0 && ` (${repo.comments.length})`}
                      </button>

                      {showComments[repo.id] && (
                        <div className="comments-container">
                          {repo.comments && repo.comments.length > 0 ? (
                            <div className="comments-list">
                              {repo.comments.map((comment, index) => (
                                <div key={index} className="comment">
                                  <strong>{comment.username || 'Anonymous'}:</strong> {comment.content}
                                  <small> - {new Date(comment.created_at).toLocaleDateString()}</small>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p>No comments yet.</p>
                          )}
                          
                          <div className="add-comment">
                            <textarea
                              value={commentTexts[repo.id] || ""}
                              onChange={(e) => handleCommentChange(repo.id, e.target.value)}
                              placeholder="Add a comment..."
                              rows={2}
                            />
                            <button 
                              onClick={() => submitComment(repo.id)}
                              className="btn-primary"
                              disabled={!commentTexts[repo.id]?.trim()}
                            >
                              Comment
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="empty-state">
            <h3>No Repositories Yet</h3>
            <p>Start by uploading your first repository!</p>
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div className="upload-section-container">
        <button onClick={toggleUploadForm} className="btn-primary upload-toggle-btn">
          {showUploadForm ? "Cancel Upload" : "📁 Upload New Repository"}
        </button>

        {showUploadForm && (
          <div className="upload-section">
            <h3>Create a New Repository</h3>

            <label><strong>Repository Title</strong></label>
            <input
              placeholder="Enter title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <label><strong>Description</strong></label>
            <input
              placeholder="Short description of your project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <label><strong>Tags</strong> (comma-separated)</label>
            <input
              placeholder="#react, #api"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />

            <label><strong>Visibility</strong></label>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ marginRight: '1rem' }}>
                <input
                  type="radio"
                  name="visibility"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                />
                Public
              </label>
              <label>
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                />
                Private
              </label>
            </div>

            <label><strong>Code Content</strong></label>
            <textarea
              className="code-input"
              placeholder="Paste your code here..."
              rows={10}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />

            <div className="upload-actions">
              <button onClick={handleUploadRepo} className="btn-primary">Upload Repository</button>
              <button onClick={toggleUploadForm} className="btn-secondary">Cancel</button>
            </div>
            
            {message && <div className="status-message">{message}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyRepositories;

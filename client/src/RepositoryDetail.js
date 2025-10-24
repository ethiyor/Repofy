import React, { useState, useEffect, useRef } from "react";
import "./App.css";

// Use environment-based URLs
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://repofy-backend.onrender.com'
  : 'http://localhost:4000';

function RepositoryDetail({ session, repo, onBack, onStar, onDownload }) {
  // Ref for the top of the detail view (Back to Community button)
  const topRef = useRef(null);
  // Scroll to the topRef when repo changes (i.e., when detail is opened)
  useEffect(() => {
    if (repo && topRef.current) {
      topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [repo]);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [commentTexts, setCommentTexts] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [expandedFiles, setExpandedFiles] = useState(new Set());

  useEffect(() => {
    if (repo) {
      loadFiles();
      loadComments();
    }
  }, [repo]);

  const loadFiles = async () => {
    if (repo.files && repo.files.length > 0) {
      setFiles(repo.files);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/repos/${repo.id}/files`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) {
        const fileData = await res.json();
        setFiles(fileData);
      } else {
        window.notify?.error("Failed to load files");
      }
    } catch (err) {
      window.notify?.error("Error fetching files");
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    console.log("Loading comments for repo:", repo.id);
    try {
      const response = await fetch(`${API_BASE_URL}/repos/${repo.id}/comments`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const commentsData = await response.json();
        console.log("Comments loaded:", commentsData);
        setComments(commentsData);
      } else if (response.status === 500) {
        // Table might not exist yet - silently fail
        console.log("Comments table not yet created");
        setComments([]);
      } else {
        console.error("Failed to load comments, status:", response.status);
        setComments([]);
      }
    } catch (err) {
      console.error("Error loading comments:", err);
      setComments([]);
    }
  };

  const handleStarRepo = async () => {
    try {
      await onStar(repo.id);
      window.notify?.success("Repository starred successfully!");
    } catch (err) {
      window.notify?.error("Failed to star repository");
    }
  };

  const toggleComments = () => {
    setShowComments(!showComments);
  };

  const submitComment = async () => {
    if (!commentTexts.trim()) return;

    console.log("Submitting comment:", commentTexts);
    try {
      const response = await fetch(`${API_BASE_URL}/repos/${repo.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: commentTexts }),
      });

      if (response.ok) {
        const responseData = await response.json();
        console.log("Comment submission response:", responseData);
        setCommentTexts("");
        window.notify?.success("Comment added successfully!");
        // Refresh comments after adding new one
        await loadComments();
      } else {
        const errorData = await response.json();
        console.error("Failed to add comment:", errorData);
        window.notify?.error("Failed to add comment");
      }
    } catch (err) {
      console.error("Error adding comment:", err);
      window.notify?.error("Error adding comment");
    }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/repos/${repo.id}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        window.notify?.success("Comment deleted successfully!");
        await loadComments();
      } else {
        window.notify?.error("Failed to delete comment");
      }
    } catch (err) {
      window.notify?.error("Error deleting comment");
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

  const toggleFileExpansion = (index) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedFiles(newExpanded);
  };

  const truncateContent = (content, maxLines = 20) => {
    if (!content) return '';
    const lines = content.split('\n');
    if (lines.length <= maxLines) return content;
    return lines.slice(0, maxLines).join('\n');
  };

  const shouldTruncate = (content, maxLines = 20) => {
    if (!content) return false;
    return content.split('\n').length > maxLines;
  };

  // Build a simple tree from files with optional path
  const buildTree = (fileList) => {
    const root = { type: 'dir', name: '', children: {} };
    for (const f of fileList) {
      const dir = (f.path || '').replace(/\\/g, '/');
      const parts = dir ? dir.split('/') : [];
      let node = root;
      for (const p of parts) {
        if (!p) continue;
        node.children[p] = node.children[p] || { type: 'dir', name: p, children: {} };
        node = node.children[p];
      }
      const fileName = f.name || 'file';
      node.children[fileName] = { type: 'file', name: fileName, file: f };
    }
    return root;
  };

  const tree = buildTree(files);

  const toggleNode = (pathKey) => {
    setExpandedNodes(prev => ({ ...prev, [pathKey]: !prev[pathKey] }));
  };

  const renderTree = (node, basePath = '') => {
    const entries = Object.values(node.children || {}).sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return (
      <ul className="file-tree">
        {entries.map((child) => {
          const childPath = basePath ? `${basePath}/${child.name}` : child.name;
          if (child.type === 'dir') {
            const isOpen = !!expandedNodes[childPath];
            return (
              <li key={childPath}>
                <div className="tree-node" onClick={() => toggleNode(childPath)}>
                  <span className="folder-icon">{isOpen ? '📂' : '📁'}</span> {child.name}
                </div>
                {isOpen && renderTree(child, childPath)}
              </li>
            );
          }
          // file
          const f = child.file;
          const idx = files.indexOf(f);
          const isExpanded = expandedFiles.has(idx);
          return (
            <li key={childPath}>
              <div className="tree-node" onClick={() => toggleFileExpansion(idx)}>
                <span className="file-icon">📄</span> {child.name}
              </div>
              {isExpanded && (
                <pre className="file-content">
{truncateContent(f.content || '')}
{shouldTruncate(f.content || '') && '\n...'}
                </pre>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  if (!repo) {
    return <div>Repository not found</div>;
  }

  return (
    <div className="repository-detail-container" ref={topRef}>
  {/* Header with Back Button */}
      <div className="repo-detail-header">
        <button onClick={onBack} className="btn-secondary back-btn">
          ← Back to Community
        </button>
      </div>

      {/* User Profile Section - First */}
      <div className="user-profile-section">
        <div className="profile-header">
          {repo.avatar_url && (
            <img 
              src={repo.avatar_url} 
              alt={`${repo.display_name}'s avatar`}
              className="profile-avatar-large"
            />
          )}
          <div className="profile-info">
            <h1 className="profile-name">{repo.display_name}</h1>
            <p className="profile-username">@{repo.username}</p>
          </div>
        </div>
      </div>

      {/* Repository Information */}
      <div className="repo-info-section">
        <div className="repo-header-with-right-stats">
          <div className="repo-title-info">
            <h2>
              {repo.name}
              {repo.is_public ? (
                <span className="visibility-badge public">Public</span>
              ) : (
                <span className="visibility-badge private">Private</span>
              )}
            </h2>
            <p className="repo-description-large">{repo.description}</p>
          </div>
          <div className="repo-stats-right-edge">
            <span className="stat-item">⭐{repo.star_count || 0} stars</span>
            <span className="stat-item">📁{files.length} files</span>
            <span className="stat-item">📅Created {formatTimeAgo(repo.created_at)}</span>
          </div>
        </div>
      </div>

          {/* About Section */}
          <div className="repo-about-section">
            <h3>About</h3>
            <div className="about-grid">
              <div className="about-item"><strong>Visibility:</strong> {repo.is_public ? 'Public' : 'Private'}</div>
              <div className="about-item"><strong>Stars:</strong> {repo.star_count || 0}</div>
              <div className="about-item"><strong>Comments:</strong> {comments?.length || 0}</div>
              <div className="about-item"><strong>Created:</strong> {formatDate(repo.created_at)}</div>
              <div className="about-item"><strong>Owner:</strong> {repo.display_name} (@{repo.username})</div>
            </div>
          </div>

      {/* Files Tree */}
      <div className="files-section">
        <h3>Files</h3>
        {loading ? (
          <div>Loading files...</div>
        ) : files.length === 0 ? (
          <div className="empty-state">No files uploaded yet.</div>
        ) : (
          <div className="files-tree-list">
            {renderTree(tree)}
          </div>
        )}
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="comments-detail-section">
          <h3>💬 Comments</h3>
          <div className="comment-input-section">
            <textarea
              value={commentTexts}
              onChange={(e) => setCommentTexts(e.target.value)}
              placeholder="Add a comment..."
              className="comment-input"
              rows={3}
            />
            <button
              onClick={submitComment}
              className="btn-primary"
              disabled={!commentTexts.trim()}
            >
              Add Comment
            </button>
          </div>
          {/* Comments List */}
          <div className="comments-list">
            {console.log("Current comments state:", comments)}
            {comments.length === 0 ? (
              <p className="no-comments">No comments yet. Be the first to comment!</p>
            ) : (
              comments.map((comment, index) => (
                <div key={index} className="comment-item">
                  <div className="comment-header">
                    <img 
                      src={comment.avatar_url || '/default-avatar.png'} 
                      alt={comment.username}
                      className="comment-avatar"
                    />
                    <div className="comment-meta">
                      <span className="comment-author">{comment.display_name || comment.username}</span>
                      <span className="comment-username">@{comment.username}</span>
                      <span className="comment-date">{formatTimeAgo(comment.created_at)}</span>
                    </div>
                    {comment.user_id === session.user.id && (
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="delete-comment-btn"
                        title="Delete comment"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  <div className="comment-content">
                    {comment.content}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default RepositoryDetail;

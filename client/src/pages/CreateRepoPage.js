import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DevDiagnostics from '../components/DevDiagnostics';

export default function CreateRepoPage({ session, createRepository }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      window.notify?.error('Repository name is required');
      return;
    }
    setBusy(true);
    try {
      const repo = await createRepository({ title, description, tags, isPublic }, session?.access_token);
      window.notify?.success('Repository created. Redirecting to editor...');
      navigate(`/repos/${repo.id}/edit`);
    } catch (err) {
      window.notify?.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="upload-section">
      <div className="upload-form">
        <h3>📤 Create New Repository</h3>

        <div className="form-group">
          <label htmlFor="repo-title">Repository Name *</label>
          <input
            id="repo-title"
            type="text"
            placeholder="Enter repository name..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
          />
        </div>

        <div className="form-group">
          <label htmlFor="repo-description">Description (optional)</label>
          <textarea
            id="repo-description"
            placeholder="Describe your repository..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label htmlFor="repo-tags">Tags</label>
          <input
            id="repo-tags"
            type="text"
            placeholder="javascript, react, nodejs (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="form-input"
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
          <button className="btn-primary" onClick={handleCreate} disabled={busy || !title.trim()}>
            🚀 Create Repository
          </button>
        </div>
      </div>
      {process.env.NODE_ENV !== 'production' && (
        <DevDiagnostics />
      )}
    </div>
  );
}

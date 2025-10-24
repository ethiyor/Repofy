import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://repofy-backend.onrender.com'
  : 'http://localhost:4000';

export default function RepoEditor({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // New file/upload state
  const [dirPath, setDirPath] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');

  const canEdit = useMemo(() => !!session?.access_token, [session]);

  const loadRepo = async () => {
    if (!session?.access_token) return;
    try {
      // Fetch all repos then find; server lacks GET /repos/:id
      const res = await fetch(`${API_BASE_URL}/repos`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to load repository');
      const data = await res.json();
      const found = data.find((r) => String(r.id) === String(id));
      setRepo(found || null);
    } catch (e) {
      window.notify?.error(e.message);
    }
  };

  const loadFiles = async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/repos/${id}/files`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error('Failed to load files');
      setFiles(await res.json());
    } catch (e) {
      window.notify?.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepo();
    loadFiles();
  }, [id, session?.access_token]);

  const normalizedDir = (dirPath || '').trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');

  const createFile = async () => {
    if (!fileName) {
      window.notify?.error('Please enter a file name');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          repo_id: id,
          name: fileName,
          content: fileContent || '',
          path: normalizedDir || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'File upload failed');
      setFileContent('');
      setFileName('');
      await loadFiles();
      window.notify?.success('File created');
    } catch (e) {
      window.notify?.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const uploadLocalFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          repo_id: id,
          name: file.name,
          content: text,
          path: normalizedDir || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'File upload failed');
      e.target.value = '';
      await loadFiles();
      window.notify?.success('File uploaded');
    } catch (error) {
      window.notify?.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="repo-editor-page">
      <div className="repo-editor-header">
        <button className="btn-secondary" onClick={() => navigate(-1)}>← Back</button>
        <h2>Repository Editor</h2>
      </div>

      {!repo ? (
        <div className="empty-state">Loading repository...</div>
      ) : (
        <div className="repo-meta">
          <h3>{repo.name} {repo.is_public ? (<span className="visibility-badge public">Public</span>) : (<span className="visibility-badge private">Private</span>)}</h3>
          {repo.description ? <p className="muted">{repo.description}</p> : <p className="muted">No description</p>}
          <div className="meta-row">
            <span>Owner: {repo.display_name} (@{repo.username})</span>
            <span>Stars: {repo.star_count || 0}</span>
          </div>
        </div>
      )}

      {canEdit && (
        <div className="file-manager">
          <h4>Add files</h4>
          <div className="form-group">
            <label>Directory path (optional)</label>
            <input
              type="text"
              placeholder="e.g., src/components"
              value={dirPath}
              onChange={(e) => setDirPath(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="file-actions-split">
            <div className="new-file">
              <div className="form-group">
                <label>New file name</label>
                <input
                  type="text"
                  placeholder="e.g., index.js"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>File content</label>
                <textarea
                  rows={8}
                  className="form-input code-input"
                  placeholder={`Content...`}
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                />
              </div>
              <button className="btn-primary" onClick={createFile} disabled={busy || !fileName}>
                Create file
              </button>
            </div>

            <div className="upload-file">
              <label>Upload a local file</label>
              <input type="file" onChange={uploadLocalFile} disabled={busy} />
            </div>
          </div>
        </div>
      )}

      <div className="files-section" style={{ marginTop: 24 }}>
        <h3>Files</h3>
        {loading ? (
          <div>Loading files...</div>
        ) : files.length === 0 ? (
          <div className="empty-state">No files yet. Add one above.</div>
        ) : (
          <ul className="file-list-simple">
            {files.map((f) => (
              <li key={f.id}>
                <span className="file-path">{f.path ? `${f.path}/` : ''}{f.name}</span>
                <span className="muted" style={{ marginLeft: 8 }}>{(f.content || '').length} chars</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import './RepoListEnhanced.css';

// Simple folder/file builder that collects files with paths and contents
// Contract:
// - props.files: [{ path: 'src/index.js', content: '...' }]
// - props.onChange: (filesArray) => void
// - props.disabled?: boolean

const emptyFile = () => ({ path: '', content: '' });

export default function FolderBuilder({ files = [], onChange, disabled = false }) {
  const [localFiles, setLocalFiles] = useState(files.length ? files : [emptyFile()]);

  const update = (next) => {
    setLocalFiles(next);
    onChange?.(next);
  };

  const addFile = () => {
    update([...localFiles, emptyFile()]);
  };

  const removeFile = (index) => {
    const next = localFiles.filter((_, i) => i !== index);
    update(next.length ? next : [emptyFile()]);
  };

  const updatePath = (index, path) => {
    const next = [...localFiles];
    next[index] = { ...next[index], path };
    update(next);
  };

  const updateContent = (index, content) => {
    const next = [...localFiles];
    next[index] = { ...next[index], content };
    update(next);
  };

  const treePreview = useMemo(() => {
    // Build a simple directory set from file paths
    const dirs = new Set();
    for (const f of localFiles) {
      const p = (f.path || '').trim().replace(/\\/g, '/');
      if (!p) continue;
      const parts = p.split('/');
      parts.pop(); // remove filename
      let acc = '';
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : part;
        dirs.add(acc);
      }
    }
    return Array.from(dirs).sort();
  }, [localFiles]);

  return (
    <div className="folder-builder">
      <div className="folder-builder-header">
        <h4>📁 Folder Structure (beta)</h4>
        <p className="muted">Add files with paths like <code>src/index.js</code> or <code>lib/utils/math.ts</code>. Folders will be created implicitly from paths.</p>
      </div>

      {localFiles.map((f, idx) => (
        <div key={idx} className="file-row">
          <div className="file-row-header">
            <input
              type="text"
              placeholder="e.g., src/index.js"
              value={f.path}
              onChange={(e) => updatePath(idx, e.target.value)}
              disabled={disabled}
              className="form-input"
              aria-label={`file-path-${idx}`}
            />
            <button type="button" className="btn-secondary small" onClick={() => removeFile(idx)} disabled={disabled}>
              Remove
            </button>
          </div>
          <textarea
            placeholder="File content..."
            value={f.content}
            onChange={(e) => updateContent(idx, e.target.value)}
            disabled={disabled}
            rows={6}
            className="form-input code-input"
            aria-label={`file-content-${idx}`}
          />
        </div>
      ))}

      <div className="folder-builder-actions">
        <button type="button" className="btn-secondary" onClick={addFile} disabled={disabled}>
          + Add another file
        </button>
      </div>

      {treePreview.length > 0 && (
        <div className="folder-builder-preview">
          <h5>Preview</h5>
          <ul>
            {treePreview.map((d) => (
              <li key={d}><code>{d}</code></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

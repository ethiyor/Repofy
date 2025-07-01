import React, { useEffect, useState } from "react";
import "./App.css";

function RepoList({ session, repos, setRepos, onStar, onDownload }) {
  const [loadingRepoId, setLoadingRepoId] = useState(null);
  const [commentTexts, setCommentTexts] = useState({});

  const toggleFiles = async (repoId) => {
    const updatedRepos = [...repos];
    const repoIndex = updatedRepos.findIndex((r) => r.id === repoId);
    const repo = updatedRepos[repoIndex];

    if (!repo.showFiles) {
      setLoadingRepoId(repoId);
      try {
        const res = await fetch(`https://repofy-backend.onrender.com/repos/${repoId}/files`, {
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
      const res = await fetch(`https://repofy-backend.onrender.com/repos/${repoId}`, {
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

  if (!session) return null;

  return (
    <div className="repo-list">
      <h2>📁 Your Repositories</h2>
      {repos.length === 0 ? (
        <p>No repositories found.</p>
      ) : (
        repos.map((repo) => (
          <div key={repo.id} className="repo-card">
            <h3>{repo.name}</h3>
            <p>{repo.description}</p>

            {repo.tags && repo.tags.length > 0 && (
              <div className="tag-container">
                {repo.tags.map((tag, index) => (
                  <span key={index} className="tag-badge">#{tag}</span>
                ))}
              </div>
            )}

            <div className="repo-actions">
              <button onClick={() => toggleFiles(repo.id)}>
                {repo.showFiles ? "Hide Files" : "View Files"}
              </button>
              <button onClick={() => onStar(repo.id)}>⭐ {repo.stars || 0}</button>
              <button onClick={() => deleteRepo(repo.id)} style={{ background: "#f44336" }}>
                🗑️ Delete
              </button>
              <button disabled>💬 Comments (Coming soon)</button>
            </div>

            {repo.showFiles && (
              <div className="file-list">
                {loadingRepoId === repo.id ? (
                  <p>Loading files...</p>
                ) : repo.files.length > 0 ? (
                  repo.files.map((file) => (
                    <div key={file.id} className="file-block">
                      <div className="file-header">
                        <strong>{file.name}</strong>
                        <div>
                          <button onClick={() => onDownload(file)}>⬇️ Download</button>
                          <button disabled>✏️ Edit</button>
                        </div>
                      </div>
                      <pre className="file-content">{file.content}</pre>
                    </div>
                  ))
                ) : (
                  <p>No files found in this repository.</p>
                )}
              </div>
            )}

            <div className="comment-section">
              <textarea
                placeholder="Leave a comment..."
                value={commentTexts[repo.id] || ""}
                onChange={(e) =>
                  setCommentTexts({ ...commentTexts, [repo.id]: e.target.value })
                }
              />
              <button disabled>Submit (Coming soon)</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default RepoList;

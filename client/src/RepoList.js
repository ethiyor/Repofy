import React, { useEffect, useState } from "react";
import "./App.css";

function RepoList({ session }) {
  const [repos, setRepos] = useState([]);

  useEffect(() => {
    const fetchRepos = async () => {
      if (!session) return;

      const token = session.access_token;

      const res = await fetch("https://repofy-backend.onrender.com/repos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRepos(data.map((repo) => ({ ...repo, showFiles: false, files: [] })));
      } else {
        console.error("Failed to load repositories");
      }
    };

    fetchRepos();
  }, [session]);

  const toggleFiles = async (repoId) => {
    const updatedRepos = [...repos];
    const repoIndex = updatedRepos.findIndex((r) => r.id === repoId);
    const repo = updatedRepos[repoIndex];

    if (!repo.showFiles) {
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
    }

    repo.showFiles = !repo.showFiles;
    updatedRepos[repoIndex] = repo;
    setRepos(updatedRepos);
  };

  // ✅ If not signed in, show nothing
  if (!session) return null;

  return (
    <div>
      <h2>📁 Public Repositories</h2>
      {repos.length === 0 ? (
        <p>No repositories found.</p>
      ) : (
        repos.map((repo) => (
          <div key={repo.id} className="repo-card">
            <h3>{repo.name}</h3>
            <p>{repo.description}</p>
            <button onClick={() => toggleFiles(repo.id)}>
              {repo.showFiles ? "Hide Files" : "View Files"}
            </button>

            {repo.showFiles && (
              <ul>
                {repo.files.length > 0 ? (
                  repo.files.map((file) => (
                    <li key={file.id}>
                      <strong>{file.name}</strong>
                      <pre
                        style={{
                          background: "#f4f4f4",
                          padding: "10px",
                          borderRadius: "6px",
                          overflowX: "auto",
                        }}
                      >
                        {file.content}
                      </pre>
                    </li>
                  ))
                ) : (
                  <p>No files found in this repository.</p>
                )}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default RepoList;

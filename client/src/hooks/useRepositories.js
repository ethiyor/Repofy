// Custom hook for repository management
import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://repofy-backend.onrender.com' 
  : 'http://localhost:4000';

export const useRepositories = (session) => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRepos = async (token) => {
    if (!token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/repos`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch repositories.");

      const data = await res.json();
      const seen = new Set();
      const enrichedRepos = data
        .filter((repo) => {
          if (seen.has(repo.id)) return false;
          seen.add(repo.id);
          return true;
        })
        .map((repo) => ({
          ...repo,
          showFiles: false,
          files: [],
        }));

      setRepos(enrichedRepos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadRepo = async (repoData, token) => {
    if (!token) throw new Error("No authentication token");

    const { title, description, tags, code, isPublic } = repoData;

    if (!title || !description || !code) {
      throw new Error("All fields must be filled out.");
    }

    try {
      // Create repository
      const repoRes = await fetch(`${API_BASE_URL}/repos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: title,
          description,
          tags: tags.split(",").map((t) => t.trim()),
          is_public: isPublic,
        }),
      });

      const repoResponseData = await repoRes.json();

      if (!repoRes.ok) {
        throw new Error(repoResponseData.error || "Failed to create repository");
      }

      const repo_id = repoResponseData.id;

      // Upload file
      const fileRes = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: "main.js", content: code, repo_id }),
      });

      if (!fileRes.ok) {
        const err = await fileRes.json();
        throw new Error(err.error || "File upload failed");
      }

      // Refresh repositories
      await fetchRepos(token);
      return "Repository and file uploaded successfully!";
    } catch (err) {
      throw new Error(err.message);
    }
  };

  const starRepo = async (id, token) => {
    try {
      const res = await fetch(`${API_BASE_URL}/repos/${id}/star`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        await fetchRepos(token);
        return true;
      } else {
        throw new Error("Failed to star repository");
      }
    } catch (err) {
      throw new Error("Error starring repository");
    }
  };

  useEffect(() => {
    if (session?.access_token) {
      fetchRepos(session.access_token);
    }
  }, [session]);

  return {
    repos,
    setRepos,
    loading,
    error,
    fetchRepos,
    uploadRepo,
    starRepo,
    refreshRepos: () => session?.access_token && fetchRepos(session.access_token)
  };
};

import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import supabase from "./supabase";
import AuthForm from "./AuthForm";
import RepoList from "./RepoList";
import ConfirmPage from "./ConfirmPage";
import "./App.css";
import Navbar from "./Navbar";

function App() {
  const [session, setSession] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [repos, setRepos] = useState([]);

  const toggleDarkMode = () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchRepos = async (token) => {
    try {
      const res = await fetch("https://repofy-backend.onrender.com/repos", {
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
      setMessage("❌ " + err.message);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRepos(session.access_token);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchRepos(session.access_token);
    });
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRepos([]);
    setMessage("✅ You have been logged out.");
  };

  const uploadRepo = async () => {
    const token = session?.access_token;
    setMessage("");

    if (!title || !description || !code) {
      setMessage("❌ All fields must be filled out.");
      return;
    }

    try {
      const repoRes = await fetch("https://repofy-backend.onrender.com/repos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: title,
          description,
          tags: tags.split(",").map((t) => t.trim()),
        }),
      });

      const repoData = await repoRes.json();
      if (!repoRes.ok) {
        setMessage("❌ Error creating repo: " + repoData.error);
        return;
      }

      const repo_id = repoData.id;

      const fileRes = await fetch("https://repofy-backend.onrender.com/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: "main.js", content: code, repo_id }),
      });

      if (!fileRes.ok) {
        const err = await fileRes.json();
        setMessage("❌ File upload failed: " + err.error);
        return;
      }

      setMessage("✅ Repository and file uploaded successfully!");
      setTitle("");
      setDescription("");
      setTags("");
      setCode("");
      await fetchRepos(token);
    } catch (err) {
      setMessage("❌ Unexpected error: " + err.message);
    }
  };

  const starRepo = async (id) => {
    try {
      const res = await fetch(`https://repofy-backend.onrender.com/repos/${id}/star`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (res.ok) await fetchRepos(session.access_token);
      else setMessage("❌ Failed to star repository");
    } catch (err) {
      setMessage("❌ Error starring repository");
    }
  };

  const downloadFile = (file) => {
    const blob = new Blob([file.content], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
  };

  return (
    <Router>
      <div className="App">
        <Navbar onToggleDarkMode={toggleDarkMode} />

        <header className="app-header">
          <h1>🚀 Welcome to Repofy</h1>
          <p className="tagline">Your personal mini GitHub – simplified and fast.</p>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <Dashboard
                  session={session}
                  logout={logout}
                  uploadRepo={uploadRepo}
                  title={title}
                  description={description}
                  tags={tags}
                  code={code}
                  setTitle={setTitle}
                  setDescription={setDescription}
                  setTags={setTags}
                  setCode={setCode}
                  message={message}
                  repos={repos}
                  setRepos={setRepos}
                  onStar={starRepo}
                  onDownload={downloadFile}
                />
              ) : (
                <>
                  <p className="cta-text">
                    🔐 Sign in to create, upload, and explore your repositories!
                  </p>
                  <AuthForm onAuthSuccess={setSession} />
                </>
              )
            }
          />
          <Route path="/confirm" element={<ConfirmPage />} />
        </Routes>

        <footer className="footer">
          <hr />
          <p>
            © {new Date().getFullYear()} Repofy |{" "}
            <a href="mailto:ytk2108@columbia.edu">Contact The Creator</a> | 💻 Built with{" "}
            <a href="https://react.dev/">React</a> &{" "}
            <a href="https://supabase.com/">Supabase</a>
          </p>
        </footer>
      </div>
    </Router>
  );
}

// ✅ Dashboard component with greeting
function Dashboard({
  session,
  logout,
  uploadRepo,
  title,
  description,
  tags,
  code,
  setTitle,
  setDescription,
  setTags,
  setCode,
  message,
  repos,
  setRepos,
  onStar,
  onDownload,
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "☀️ Good morning" :
    hour < 18 ? "🌤️ Good afternoon" :
    "🌙 Good evening";

  return (
    <div>
      <div className="intro">
        <h2>{greeting}, {session.user.email.split("@")[0]}!</h2>
        <p>
          Easily upload and manage your code repositories. Fill in your project
          details below and share your work with the world.
        </p>
        <button onClick={logout} style={{ float: "right" }}>
          🚪 Log Out
        </button>
        {session.user.email.endsWith(".edu") && (
          <div className="edu-badge">🎓 Verified .EDU Account</div>
        )}
      </div>

      {message && <div className="status-message">{message}</div>}

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

        <label><strong>Code Content</strong></label>
        <textarea
         className="code-input"
          placeholder="Paste your code here..."
          rows={10}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button onClick={uploadRepo}>📤 Upload Repository</button>
      </div>

      <RepoList
        session={session}
        repos={repos}
        setRepos={setRepos}
        onStar={onStar}
        onDownload={onDownload}
      />
    </div>
  );
}

export default App;

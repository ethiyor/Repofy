import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import supabase from "./supabase";
import AuthForm from "./AuthForm";
import RepoList from "./RepoList";
import ConfirmPage from "./ConfirmPage";
import "./App.css";

function App() {
  const [session, setSession] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setMessage("✅ You have been logged out.");
  };

  const uploadRepo = async () => {
    const token = session?.access_token;
    setMessage("");

    try {
      // Step 1: Create the repo
      const repoRes = await fetch("https://repofy-backend.onrender.com/repos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: title, description }),
      });

      const repoData = await repoRes.json();

      if (!repoRes.ok) {
        setMessage("❌ Error creating repo: " + repoData.error);
        return;
      }

      const repo_id = repoData.id;

      // Step 2: Upload the file to the repo
      const fileRes = await fetch("https://repofy-backend.onrender.com/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: "main.js", content: code, repo_id }),
      });

      if (fileRes.ok) {
        setMessage("✅ Repository and file uploaded successfully!");
        setTitle("");
        setDescription("");
        setCode("");
      } else {
        const err = await fileRes.json();
        setMessage("❌ File upload failed: " + err.error);
      }
    } catch (err) {
      setMessage("❌ Unexpected error: " + err.message);
    }
  };

  const Dashboard = () => (
    <div>
      <div className="intro">
        <h2>Welcome to Repofy!</h2>
        <p>
          Easily upload and manage your code repositories. Fill in your project
          details below and share your work with the world.
        </p>
        <button onClick={logout} style={{ float: "right" }}>
          🚪 Log Out
        </button>
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

        <label><strong>Code Content</strong></label>
        <textarea
          placeholder="Paste your code here..."
          rows={10}
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />

        <button onClick={uploadRepo}>📤 Upload Repository</button>
      </div>

      <RepoList session={session} />
    </div>
  );

  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <h1>🚀 Repofy</h1>
          <p className="tagline">
            Your personal mini GitHub – simplified and fast.
          </p>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <Dashboard />
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
            <a href="mailto:ytk2108@columbia.edu" style={{ textDecoration: "none" }}>
              Contact The Creator
            </a>{" "}
            | 💻 Built with <a href="https://react.dev/">React</a> &{" "}
            <a href="https://supabase.com/">Supabase</a>
          </p>
        </footer>
      </div>
    </Router>
  );
}

export default App;

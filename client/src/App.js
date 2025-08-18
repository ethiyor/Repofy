import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import supabase from "./supabase";
import AuthForm from "./AuthForm";
import RepoList from "./RepoList";
import ConfirmPage from "./ConfirmPage";
import { getUserProfile } from "./api";
import "./App.css";
import Navbar from "./Navbar";

function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [repos, setRepos] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);

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

  // Use environment-based URLs
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://repofy-backend.onrender.com' 
    : 'http://localhost:4000';

  const fetchRepos = async (token) => {
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
      setMessage("❌ " + err.message);
    }
  };

  const fetchUserProfile = async (token) => {
    try {
      const profile = await getUserProfile(token);
      setUserProfile(profile);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
      // Don't show error to user, just use email as fallback
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Only set session if user is confirmed
      if (session && session.user.email_confirmed_at) {
        setSession(session);
        fetchRepos(session.access_token);
        fetchUserProfile(session.access_token);
      }
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      // Only set session if user is confirmed
      if (session && session.user.email_confirmed_at) {
        setSession(session);
        fetchRepos(session.access_token);
        fetchUserProfile(session.access_token);
      } else if (!session) {
        setSession(null);
        setUserProfile(null);
        setRepos([]);
      }
    });
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
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

      const repoData = await repoRes.json();
      if (!repoRes.ok) {
        setMessage("❌ Error creating repo: " + repoData.error);
        return;
      }

      const repo_id = repoData.id;

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
        setMessage("File upload failed: " + err.error);
        return;
      }

      setMessage("Repository and file uploaded successfully!");
      setTitle("");
      setDescription("");
      setTags("");
      setCode("");
      setIsPublic(true);
      setShowUploadForm(false); // Close the form after successful upload
      await fetchRepos(token);
    } catch (err) {
      setMessage("❌ Unexpected error: " + err.message);
    }
  };

  const starRepo = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/repos/${id}/star`, {
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
          <h1>Welcome to Repofy</h1>
          <p className="tagline">Your personal mini GitHub – simplified and fast.</p>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <Dashboard
                  session={session}
                  userProfile={userProfile}
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
                  isPublic={isPublic}
                  setIsPublic={setIsPublic}
                  showUploadForm={showUploadForm}
                  setShowUploadForm={setShowUploadForm}
                />
              ) : (
                <>
                  <p className="cta-text">
                    Sign in to create, upload, and explore your repositories!
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
            <a href="mailto:ytk2108@columbia.edu">Contact</a> | Built with{" "}
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
  userProfile,
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
  isPublic,
  setIsPublic,
  showUploadForm,
  setShowUploadForm,
}) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 18 ? "Good afternoon" :
    "Good evening";

  // Get display name with fallbacks
  const getDisplayName = () => {
    if (userProfile?.display_name) return userProfile.display_name;
    if (userProfile?.username) return userProfile.username;
    if (session?.user?.user_metadata?.username) return session.user.user_metadata.username;
    return session.user.email.split("@")[0];
  };

  const toggleUploadForm = () => {
    setShowUploadForm(!showUploadForm);
    // Clear form when closing
    if (showUploadForm) {
      setTitle("");
      setDescription("");
      setTags("");
      setCode("");
      setIsPublic(true);
    }
  };

  return (
    <div>
      <div className="intro">
        <h2>{greeting}, {getDisplayName()}!</h2>
        <p>
          Easily upload and manage your code repositories. Click the button below to create a new repository.
        </p>
        <div className="intro-actions">
          <button onClick={logout} className="logout-btn">
            Log Out
          </button>
          <button onClick={toggleUploadForm} className="btn-primary">
            {showUploadForm ? "Cancel Upload" : "Upload New Repository"}
          </button>
        </div>
        {session.user.email.endsWith(".edu") && (
          <div className="edu-badge">Verified .EDU Account</div>
        )}
      </div>

      {message && <div className="status-message">{message}</div>}

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
            <button onClick={uploadRepo} className="btn-primary">Upload Repository</button>
            <button onClick={toggleUploadForm} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

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

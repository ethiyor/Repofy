import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import supabase from "./supabase";
import AuthForm from "./AuthForm";
import RepoList from "./RepoList";
import MyRepositories from "./MyRepositories";
import UserProfile from "./UserProfile";
import PublicProfile from "./PublicProfile";
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
  const [showProfile, setShowProfile] = useState(false);
  const [showPublicProfile, setShowPublicProfile] = useState(false);
  const [showMyRepositories, setShowMyRepositories] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);

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

  const fetchPublicProfile = async (userId) => {
    console.log("Fetching public profile for userId:", userId);
    
    // First, try to get profile data from current repos (which already have user info)
    const userRepos = repos.filter(repo => repo.user_id === userId);
    console.log("Found user repos:", userRepos);
    
    if (userRepos.length > 0) {
      const repoUserData = userRepos[0]; // Get user data from any repo
      console.log("User data from repos:", repoUserData);
      
      // Try to fetch detailed profile from backend first
      try {
        const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        console.log("Response status:", response.status);

        if (response.ok) {
          const profileData = await response.json();
          console.log("Fetched detailed profile data:", profileData);
          console.log("Profile bio:", profileData.bio);
          console.log("Profile location:", profileData.location);
          console.log("Profile website:", profileData.website);
          
          // Merge backend data with repo count and ensure display_name/username fallbacks
          const completeProfile = {
            ...profileData,
            repo_count: userRepos.length,
            display_name: profileData.display_name || repoUserData.display_name || repoUserData.username || 'User ' + userId.substring(0, 8),
            username: profileData.username || repoUserData.username || 'user_' + userId.substring(0, 8)
          };
          console.log("Complete profile being returned:", completeProfile);
          return completeProfile;
        } else {
          console.log("Backend profile not found, using repo data fallback");
        }
      } catch (error) {
        console.error("Error fetching from backend, using fallback:", error);
      }
      
      // Create a basic profile from repo data as fallback
      const fallbackProfile = {
        user_id: userId,
        username: repoUserData.username || 'user_' + userId.substring(0, 8),
        display_name: repoUserData.display_name || repoUserData.username || 'User ' + userId.substring(0, 8),
        bio: null,
        website: null,
        location: null,
        created_at: null,
        repo_count: userRepos.length
      };
      
      return fallbackProfile;
    } else {
      console.error("No repositories found for user, cannot create profile");
      return null;
    }
  };

  const showUserProfile = async (userId) => {
    console.log("showUserProfile called with userId:", userId);
    console.log("Current state - showProfile:", showProfile, "showPublicProfile:", showPublicProfile);
    
    const profile = await fetchPublicProfile(userId);
    console.log("Fetched profile:", profile);
    if (profile) {
      console.log("Setting selectedUserProfile and showPublicProfile to true");
      setSelectedUserProfile(profile);
      setShowPublicProfile(true);
      console.log("State should now be updated");
    } else {
      console.error("Failed to fetch profile - no repositories found for this user");
    }
  };

  const handleShowMyRepositories = () => {
    setShowMyRepositories(true);
    setShowUploadForm(false);
    setShowProfile(false);
    setShowPublicProfile(false);
  };

  const handleBackToCommunity = () => {
    setShowMyRepositories(false);
    setShowUploadForm(false);
    setShowProfile(false);
    setShowPublicProfile(false);
  };

  return (
    <Router>
      <div className="App">
        <Navbar 
          onToggleDarkMode={toggleDarkMode} 
          userProfile={userProfile}
          session={session}
          onShowProfile={() => setShowProfile(true)}
        />

        <header className="app-header">
          <h1>Welcome to Repofy</h1>
          <p className="tagline">Your personal mini GitHub – simplified and fast.</p>
        </header>

        <Routes>
          <Route
            path="/"
            element={
              session ? (
                showProfile ? (
                  <UserProfile
                    session={session}
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                    onBack={() => setShowProfile(false)}
                  />
                ) : showPublicProfile ? (
                  <PublicProfile
                    userProfile={selectedUserProfile}
                    onBack={() => {
                      setShowPublicProfile(false);
                      setSelectedUserProfile(null);
                    }}
                  />
                ) : showMyRepositories ? (
                  <MyRepositories
                    session={session}
                    repos={repos}
                    setRepos={setRepos}
                    onStar={starRepo}
                    onDownload={downloadFile}
                    onBack={handleBackToCommunity}
                    uploadRepo={uploadRepo}
                  />
                ) : (
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
                    onShowProfile={() => setShowProfile(true)}
                    onShowUserProfile={showUserProfile}
                    onShowMyRepositories={handleShowMyRepositories}
                  />
                )
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
  onShowProfile,
  onShowUserProfile,
  onShowMyRepositories,
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
        <div className="intro-header">
          <div>
            <h2>{greeting}, {getDisplayName()}!</h2>
            <p>
              Easily upload and manage your code repositories. Click the button below to create a new repository.
            </p>
          </div>
        </div>
        {session.user.email.endsWith(".edu") && (
          <div className="edu-badge">Verified .EDU Account</div>
        )}
      </div>

      <RepoList
        session={session}
        userProfile={userProfile}
        repos={repos}
        setRepos={setRepos}
        onStar={onStar}
        onDownload={onDownload}
        onShowProfile={onShowProfile}
        onShowUserProfile={onShowUserProfile}
        onShowMyRepositories={onShowMyRepositories}
      />

      <div className="main-actions">
        <button onClick={logout} className="btn-primary" title="Log Out">
          Log Out
        </button>
      </div>
    </div>
  );
}

export default App;

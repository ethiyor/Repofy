import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthForm from "./AuthForm";
import RepoList from "./RepoList";
import MyRepositories from "./MyRepositories";
import RepositoryDetail from "./RepositoryDetail";
import UserProfile from "./UserProfile";
import PublicProfile from "./PublicProfile";
import ConfirmPage from "./ConfirmPage";
import GitHubCallbackPage from "./GitHubCallbackPage";
import "./App.css";
import Navbar from "./Navbar";
import NotificationSystem from "./components/NotificationSystem";
import { useAuth } from "./hooks/useAuth";
import { useRepositories } from "./hooks/useRepositories";

function App() {
  const { session, userProfile, setUserProfile, loading, logout } = useAuth();
  const { repos, setRepos, uploadRepo: hookUploadRepo, starRepo: hookStarRepo } = useRepositories(session);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showPublicProfile, setShowPublicProfile] = useState(false);
  const [showMyRepositories, setShowMyRepositories] = useState(false);
  const [showRepositoryDetail, setShowRepositoryDetail] = useState(false);
  const [selectedRepository, setSelectedRepository] = useState(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);

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

  // Enhanced upload function with better error handling
  const uploadRepo = async () => {
    try {
      const result = await hookUploadRepo({
        title,
        description,
        tags,
        code,
        isPublic
      }, session?.access_token);
      
      window.notify?.success(result);
      setTitle("");
      setDescription("");
      setTags("");
      setCode("");
      setIsPublic(true);
      setShowUploadForm(false);
    } catch (err) {
      window.notify?.error(err.message);
    }
  };

  // Enhanced star function with better error handling
  const starRepo = async (id) => {
    try {
      await hookStarRepo(id, session?.access_token);
      window.notify?.success("Repository starred successfully!");
    } catch (err) {
      window.notify?.error(err.message);
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
    setShowRepositoryDetail(false);
    setSelectedRepository(null);
  };

  const handleShowRepositoryDetail = (repository) => {
    setSelectedRepository(repository);
    setShowRepositoryDetail(true);
    setShowMyRepositories(false);
    setShowUploadForm(false);
    setShowProfile(false);
    setShowPublicProfile(false);
  };

  const handleBackFromRepositoryDetail = () => {
    setShowRepositoryDetail(false);
    setSelectedRepository(null);
  };

  const handleLogout = async () => {
    const result = await logout();
    window.notify?.success(result);
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading Repofy...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <NotificationSystem />
        <Navbar 
          onToggleDarkMode={toggleDarkMode} 
          userProfile={userProfile}
          session={session}
          onShowProfile={() => setShowProfile(true)}
        />

        <header className="app-header">
          <h1>{isSignUp && !session ? "Welcome to Repofy" : "Repofy"}</h1>
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
                ) : showRepositoryDetail ? (
                  <RepositoryDetail
                    session={session}
                    repo={selectedRepository}
                    onBack={handleBackFromRepositoryDetail}
                    onStar={starRepo}
                    onDownload={downloadFile}
                  />
                ) : (
                  <Dashboard
                    session={session}
                    userProfile={userProfile}
                    logout={handleLogout}
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
                    onShowRepositoryDetail={handleShowRepositoryDetail}
                  />
                )
              ) : (
                <>
                  <p className="cta-text">
                    Sign in to create, upload, and explore your repositories!
                  </p>
                  <AuthForm 
                    onAuthSuccess={() => {}} 
                    isSignUp={isSignUp}
                    setIsSignUp={setIsSignUp}
                  />
                </>
              )
            }
          />
          <Route path="/confirm" element={<ConfirmPage />} />
          <Route path="/auth/callback" element={<GitHubCallbackPage />} />
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
  onShowRepositoryDetail,
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
              Easily upload and manage your code repositories. Click the buttons below to get started.
            </p>
          </div>
        </div>
        {session.user.email.endsWith(".edu") && (
          <div className="edu-badge">Verified .EDU Account</div>
        )}
      </div>

      {/* Main Action Buttons */}
      <div className="dashboard-actions">
        <button 
          onClick={onShowMyRepositories} 
          className="btn-primary action-btn"
          title="View and manage your repositories"
        >
          📚 My Repositories
        </button>
        <button 
          onClick={toggleUploadForm} 
          className="btn-secondary action-btn"
          title="Create a new repository"
        >
          ➕ {showUploadForm ? "Cancel Upload" : "Upload New Repository"}
        </button>
        <button 
          onClick={onShowProfile} 
          className="btn-secondary action-btn"
          title="Edit your profile information"
        >
          👤 Edit Profile
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
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
              <label htmlFor="repo-description">Description *</label>
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

            <div className="form-group">
              <label htmlFor="repo-code">Initial Code Content *</label>
              <textarea
                id="repo-code"
                placeholder="Paste your code here..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="form-input code-input"
                rows={8}
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
              <button 
                onClick={uploadRepo} 
                className="btn-primary"
                disabled={!title || !description || !code}
              >
                🚀 Create Repository
              </button>
              <button 
                onClick={toggleUploadForm} 
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Community Repositories */}
      <div className="community-section">
        <h3>🌐 Community Repositories</h3>
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
          onShowRepositoryDetail={onShowRepositoryDetail}
        />
      </div>

      <div className="main-actions">
        <button onClick={logout} className="btn-primary" title="Log Out">
          Log Out
        </button>
      </div>
    </div>
  );
}

export default App;

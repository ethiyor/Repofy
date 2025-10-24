import React, { useEffect, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import AuthForm from "./AuthForm";
import RepoList from "./RepoList";
import MyRepositories from "./MyRepositories";
import RepositoryDetail from "./RepositoryDetail";
import RepoEditor from "./RepoEditor";
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
  const navigate = useNavigate();
  const location = useLocation();
  const { session, userProfile, setUserProfile, loading, logout } = useAuth();
  const { repos, setRepos, uploadRepo: hookUploadRepo, starRepo: hookStarRepo, createRepository, uploadFile } = useRepositories(session);
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
  const [createdRepo, setCreatedRepo] = useState(null);

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

  // Open create repo form when ?createRepo=1 is present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('createRepo') === '1') {
      setShowUploadForm(true);
    }
  }, [location.search]);

  // Use environment-based URLs
  const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://repofy-backend.onrender.com' 
    : 'http://localhost:4000';

  // Enhanced upload function with better error handling
  const uploadRepo = async () => {
    try {
      const payload = {
        title,
        description,
        tags,
        code,
        isPublic,
      };

      const result = await hookUploadRepo(payload, session?.access_token);
      
      window.notify?.success(result);
      setTitle("");
      setDescription("");
      setTags("");
      setCode("");
      setIsPublic(true);
      setShowUploadForm(false);
      setCreatedRepo(null);
    } catch (err) {
      window.notify?.error(err.message);
    }
  };

  // Step 1: create repo metadata only
  const handleCreateRepoOnly = async () => {
    try {
      const repo = await createRepository({ title, description, tags, isPublic }, session?.access_token);
      window.notify?.success("Repository created. Redirecting to editor...");
      // Navigate to repo editor page
      navigate(`/repos/${repo.id}/edit`);
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
      <div className="App">
        <NotificationSystem />
        <Navbar 
          onToggleDarkMode={toggleDarkMode} 
          userProfile={userProfile}
          session={session}
          onShowProfile={() => setShowProfile(true)}
          onLogout={handleLogout}
          onShowMyRepositories={() => setShowMyRepositories(true)}
          onShowUploadForm={() => setShowUploadForm(true)}
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
                    handleCreateRepoOnly={handleCreateRepoOnly}
                    title={title}
                    description={description}
                    tags={tags}
                    code={code}
                    setTitle={setTitle}
                    setDescription={setDescription}
                    setTags={setTags}
                    message={message}
                    repos={repos}
                    setRepos={setRepos}
                    onStar={starRepo}
                    onDownload={downloadFile}
                    isPublic={isPublic}
                    setIsPublic={setIsPublic}
                    showUploadForm={showUploadForm}
                    setShowUploadForm={setShowUploadForm}
                    createdRepo={createdRepo}
                    setCreatedRepo={setCreatedRepo}
                    uploadFile={uploadFile}
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
          <Route path="/repos/:id/edit" element={<RepoEditor session={session} />} />
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
  );
}

// ✅ Dashboard component with greeting
function Dashboard({
  session,
  userProfile,
  logout,
  handleCreateRepoOnly,
  title,
  description,
  tags,
  setTitle,
  setDescription,
  setTags,
  message,
  repos,
  setRepos,
  onStar,
  onDownload,
  isPublic,
  setIsPublic,
  showUploadForm,
  setShowUploadForm,
  createdRepo,
  setCreatedRepo,
  uploadFile,
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
      setIsPublic(true);
      setCreatedRepo(null);
    }
  };

  return (
    <div>
      <div className="intro">
        <div className="intro-header">
          <div>
            <h2>{greeting}, {getDisplayName()}!</h2>
            <p>
              Easily upload and manage your code repositories. Click the menu at the top left corner to get started.
            </p>
          </div>
        </div>
        {session.user.email.endsWith(".edu") && (
          <div className="edu-badge">Verified .EDU Account</div>
        )}
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
              <label htmlFor="repo-description">Description (optional)</label>
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

            {/* Single-path flow: create metadata first; files are added after creation */}

            {createdRepo && (
              <RepoFilesManager
                repo={createdRepo}
                session={session}
                onUploadFile={uploadFile}
              />
            )}

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
              {!createdRepo ? (
                <button
                  onClick={handleCreateRepoOnly}
                  className="btn-primary"
                  disabled={!title}
                >
                  🚀 Create Repository
                </button>
              ) : (
                <button
                  onClick={() => {
                    setTitle(""); setDescription(""); setTags(""); setIsPublic(true); setCreatedRepo(null);
                    window.notify?.info("Repository setup complete");
                  }}
                  className="btn-secondary"
                >
                  Done
                </button>
              )}
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
    </div>
  );
}

// Minimal file manager shown after creating a repo (step 2)
function RepoFilesManager({ repo, session, onUploadFile }) {
  const [dirPath, setDirPath] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [fileInputBusy, setFileInputBusy] = useState(false);

  const fullPath = () => {
    const trimmed = (dirPath || "").trim().replace(/\\\\/g, '/').replace(/^\/+|\/+$/g, '');
    return trimmed ? `${trimmed}/${fileName}` : fileName;
  };

  const handleCreateFile = async () => {
    if (!fileName) {
      window.notify?.error('Please enter a file name');
      return;
    }
    setBusy(true);
    try {
      // Split to name + path for API (API takes name and optional path separately)
      const p = (dirPath || '').trim().replace(/\\\\/g, '/').replace(/^\/+|\/+$/g, '');
      await onUploadFile({ repo_id: repo.id, name: fileName, content: fileContent, path: p || null }, session.access_token);
      setFileContent("");
      window.notify?.success('File created');
    } catch (e) {
      window.notify?.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUploadLocalFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileInputBusy(true);
    try {
      const text = await file.text();
      const p = (dirPath || '').trim().replace(/\\\\/g, '/').replace(/^\/+|\/+$/g, '');
      await onUploadFile({ repo_id: repo.id, name: file.name, content: text, path: p || null }, session.access_token);
      window.notify?.success('File uploaded');
      // clear input value so same file can be selected again
      e.target.value = '';
    } catch (err) {
      window.notify?.error(err.message);
    } finally {
      setFileInputBusy(false);
    }
  };

  return (
    <div className="file-manager">
      <h4>Step 2: Add files to <span className="code">{repo.name}</span></h4>
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
              placeholder={`Content of ${fullPath() || 'your file'}...`}
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
            />
          </div>
          <button className="btn-primary" onClick={handleCreateFile} disabled={busy || !fileName}>
            Create file
          </button>
        </div>

        <div className="upload-file">
          <label>Upload a local file</label>
          <input type="file" onChange={handleUploadLocalFile} disabled={fileInputBusy} />
        </div>
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from "react";
import supabase from "./supabase";
import { checkUsernameAvailability } from "./api";
import "./App.css";

// Use environment-based URLs
const FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://repofy-frontend.onrender.com'
  : 'http://localhost:3000';

function AuthForm({ onAuthSuccess, isSignUp, setIsSignUp }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signUpDisabled, setSignUpDisabled] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(""); // "checking", "available", "taken", "invalid"
  const [usernameTimeout, setUsernameTimeout] = useState(null);

  // Handle GitHub authentication
  const handleGitHubAuth = async () => {
    try {
      setError("");
      setMessage("Redirecting to GitHub...");
      
      const redirectUrl = `${FRONTEND_URL}/auth/callback`;
      console.log('Initiating GitHub OAuth with redirect:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: redirectUrl,
          scopes: 'user:email'
        }
      });
      
      if (error) {
        console.error('GitHub OAuth error:', error);
        throw error;
      }
      
      console.log('GitHub OAuth initiated successfully:', data);
    } catch (err) {
      console.error('GitHub auth error:', err);
      setError(`GitHub authentication failed: ${err.message || 'Unknown error'}`);
      setMessage("");
    }
  };

  // Handle Google authentication
  const handleGoogleAuth = async () => {
    try {
      setError("");
      setMessage("Redirecting to Google...");
      
      const redirectUrl = `${FRONTEND_URL}/auth/callback`;
      console.log('Initiating Google OAuth with redirect:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          scopes: 'email profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        console.error('Google OAuth error:', error);
        if (error.message.includes('Provider not found')) {
          throw new Error('Google authentication is not configured. Please contact support.');
        }
        throw error;
      }
      
      console.log('Google OAuth initiated successfully:', data);
    } catch (err) {
      console.error('Google auth error:', err);
      setError(`Google authentication failed: ${err.message || 'Unknown error'}`);
      setMessage("");
    }
  };

  // Check username availability with debouncing
  useEffect(() => {
    if (!isSignUp || !username.trim()) {
      setUsernameStatus("");
      return;
    }

    if (username.length < 3) {
      setUsernameStatus("invalid");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setUsernameStatus("invalid");
      return;
    }

    // Clear previous timeout
    if (usernameTimeout) {
      clearTimeout(usernameTimeout);
    }

    // Set new timeout for checking availability
    const timeout = setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const result = await checkUsernameAvailability(username);
        setUsernameStatus(result.available ? "available" : "taken");
      } catch (error) {
        console.error("Username check failed:", error);
        setUsernameStatus("");
      }
    }, 500);

    setUsernameTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [username, isSignUp]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (isSignUp) {
        // Validate username
        if (!username.trim()) {
          setError("Username is required.");
          return;
        }
        
        if (username.length < 3) {
          setError("Username must be at least 3 characters long.");
          return;
        }
        
        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
          setError("Username can only contain letters, numbers, underscores, and hyphens.");
          return;
        }

        if (usernameStatus === "taken") {
          setError("Username is already taken. Please choose a different one.");
          return;
        }

        if (usernameStatus === "checking") {
          setError("Please wait while we check username availability.");
          return;
        }

        // Validate email
        if (!email.trim()) {
          setError("Email is required.");
          return;
        }

        // Sign up with email
        const signUpData = {
          email,
          password,
          options: {
            emailRedirectTo: `${FRONTEND_URL}/confirm`,
            data: {
              username: username.trim(),
              display_name: username.trim()
            }
          },
        };

        const { error } = await supabase.auth.signUp(signUpData);
        if (error) throw error;

        setMessage(`✅ A verification email has been sent to ${email}. Please check your inbox and click the confirmation link.`);
        setSignUpDisabled(true);
        return;
      }

      // Regular sign in
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Optional: store in localStorage if rememberMe is checked
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      onAuthSuccess(session);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email first.");
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${FRONTEND_URL}/reset`,
      });
      if (error) throw error;
      setMessage("✅ Password reset link sent to your email.");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-form-container">
      <h2>{isSignUp ? "Sign Up" : "Log In"}</h2>

      {error && <p className="auth-error">{error}</p>}
      {message && <p className="auth-success">{message}</p>}

      {/* Main auth form */}
      <form onSubmit={handleSubmit} className="auth-form">
        {!isSignUp ? (
          <>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </>
        ) : (
          <>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </>
        )}

          {isSignUp && (
            <>
              <label>Username</label>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  required
                  minLength="3"
                  pattern="[a-zA-Z0-9_-]+"
                  title="Username can only contain letters, numbers, underscores, and hyphens"
                  style={{
                    borderColor: 
                      usernameStatus === "available" ? "#4CAF50" :
                      usernameStatus === "taken" || usernameStatus === "invalid" ? "#f44336" :
                      "#ccc"
                  }}
                />
                {username && (
                  <div style={{ 
                    fontSize: "0.85rem", 
                    marginTop: "-0.5rem", 
                    marginBottom: "0.5rem",
                    color: 
                      usernameStatus === "available" ? "#4CAF50" :
                      usernameStatus === "taken" || usernameStatus === "invalid" ? "#f44336" :
                      "#666"
                  }}>
                    {usernameStatus === "checking" && "⏳ Checking availability..."}
                    {usernameStatus === "available" && "✅ Username available"}
                    {usernameStatus === "taken" && "❌ Username already taken"}
                    {usernameStatus === "invalid" && "❌ Invalid username format"}
                  </div>
                )}
              </div>
            </>
          )}

          <>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </>

          {!isSignUp && (
            <div className="auth-options">
              <label className="remember-me">
                <span>Remember Me</span>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
              </label>
            </div>
          )}

          <button type="submit" disabled={isSignUp && signUpDisabled}>
            {isSignUp ? "Sign Up" : "Log In"}
          </button>
        </form>

      {/* OAuth authentication options for sign up */}
      {isSignUp && (
        <div className="oauth-section">
          <div className="oauth-divider">
            <span>Or sign up with</span>
          </div>
          <div className="oauth-buttons">
            <button
              type="button"
              onClick={handleGitHubAuth}
              className="oauth-btn github-btn"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              
            GitHub
            </button>
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="oauth-btn google-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </div>
        </div>
      )}

      <p style={{ marginTop: "1rem" }}>
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          type="button"
          className="toggle-auth"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
            setMessage("");
            setUsername("");
            setUsernameStatus("");
            setSignUpDisabled(false);
            setEmail("");
          }}
        >
          {isSignUp ? "Log In" : "Sign Up"}
        </button>
        <button type="button" className="forgot-btn" onClick={handleForgotPassword}>
          Forgot Password?
        </button>
      </p>
      
      {/* OAuth authentication options for login only */}
      {!isSignUp && (
        <div className="oauth-section">
          <div className="oauth-divider">
            <span>Or continue with</span>
          </div>
          <div className="oauth-buttons">
            <button
              type="button"
              onClick={handleGitHubAuth}
              className="oauth-btn github-btn"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              GitHub
            </button>
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="oauth-btn google-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuthForm;

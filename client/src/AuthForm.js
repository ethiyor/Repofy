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
  const [verificationMethod, setVerificationMethod] = useState("email"); // "email" or "github"
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
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${FRONTEND_URL}/auth/callback`
        }
      });
      
      if (error) throw error;
    } catch (err) {
      setError(err.message);
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
        {isSignUp && (
          <div className="verification-method-selector">
            <label>Verification Method</label>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="radio"
                  name="verificationMethod"
                  value="email"
                  checked={verificationMethod === "email"}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                />
                📧 Email
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="radio"
                  name="verificationMethod"
                  value="github"
                  checked={verificationMethod === "github"}
                  onChange={(e) => setVerificationMethod(e.target.value)}
                />
                🐙 GitHub
              </label>
            </div>
          </div>
        )}

        {verificationMethod === "email" ? (
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
        ) : verificationMethod === "github" ? (
          <div style={{ textAlign: "center", padding: "1rem", backgroundColor: "#f8f9fa", borderRadius: "8px", margin: "1rem 0" }}>
            <p style={{ margin: "0 0 1rem 0", color: "#666" }}>
              🐙 Sign up with your GitHub account for instant access!
            </p>
            <button
              type="button"
              onClick={handleGitHubAuth}
              style={{
                padding: "12px 24px",
                backgroundColor: "#24292e",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "0 auto"
              }}
            >
              <span>🐙</span> Continue with GitHub
            </button>
          </div>
        ) : null}

          {isSignUp && verificationMethod !== "github" && (
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

          {verificationMethod !== "github" && (
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
          )}

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

          {verificationMethod !== "github" && (
            <button type="submit" disabled={isSignUp && signUpDisabled}>
              {isSignUp ? "Sign Up" : "Log In"}
            </button>
          )}
        </form>

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
            setVerificationMethod("email");
            setEmail("");
          }}
        >
          {isSignUp ? "Log In" : "Sign Up"}
        </button>
        {verificationMethod !== "github" && (
          <button type="button" className="forgot-btn" onClick={handleForgotPassword}>
            Forgot Password?
          </button>
        )}
      </p>
      
      {/* GitHub authentication option for login only */}
      {!isSignUp && (
        <div style={{ 
          textAlign: "center", 
          margin: "1.5rem 0", 
          borderTop: "1px solid #e1e4e8", 
          paddingTop: "1.5rem" 
        }}>
          <p style={{ margin: "0 0 1rem 0", color: "#666", fontSize: "0.9rem" }}>
            Or continue with
          </p>
          <button
            type="button"
            onClick={handleGitHubAuth}
            style={{
              padding: "12px 24px",
              backgroundColor: "#24292e",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "0 auto",
              transition: "background-color 0.2s"
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = "#1a1e22"}
            onMouseOut={(e) => e.target.style.backgroundColor = "#24292e"}
          >
            <span>🐙</span> Sign in with GitHub
          </button>
        </div>
      )}
    </div>
  );
}

export default AuthForm;

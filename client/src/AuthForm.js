import React, { useState, useEffect } from "react";
import supabase from "./supabase";
import { checkUsernameAvailability } from "./api";
import "./App.css";

// Use environment-based URLs
const FRONTEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://repofy-frontend.onrender.com'
  : 'http://localhost:3000';

function AuthForm({ onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signUpDisabled, setSignUpDisabled] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState(""); // "checking", "available", "taken", "invalid"
  const [usernameTimeout, setUsernameTimeout] = useState(null);

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

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${FRONTEND_URL}/confirm`,
            data: {
              username: username.trim(),
              display_name: username.trim()
            }
          },
        });
        if (error) throw error;

        setMessage(`✅ A verification email has been sent to ${email}. Please check your inbox and click the confirmation link.`);
        setSignUpDisabled(true);
        return;
      }

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

      <form onSubmit={handleSubmit} className="auth-form">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />

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

        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />

        {!isSignUp && (
        <div className="auth-options">
  <label className="remember-me">
    <input
      type="checkbox"
      checked={rememberMe}
      onChange={(e) => setRememberMe(e.target.checked)}
    />
    <span>Remember Me</span>
  </label>
</div>
        )}

        <button type="submit" disabled={isSignUp && signUpDisabled}>
          {isSignUp ? "Sign Up" : "Log In"}
        </button>
      </form>

      <p style={{ marginTop: "1rem" }}>
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          type="button"
          className="toggle-auth"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("")
            setMessage("");
            setUsername("");
            setUsernameStatus("");
            setSignUpDisabled(false);
          }}
        >
          {isSignUp ? "Log In" : "Sign Up"}
        </button>
         <button type="button" className="forgot-btn" onClick={handleForgotPassword}>
              Forgot Password?
            </button>
      </p>
    </div>
  );
}

export default AuthForm;

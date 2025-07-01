import React, { useState } from "react";
import supabase from "./supabase";
import "./App.css";

function AuthForm({ onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signUpDisabled, setSignUpDisabled] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: "https://repofy-frontend.onrender.com",
          },
        });
        if (error) throw error;

        setMessage(`✅ A verification email has been sent to ${email}. Please check your inbox.`);
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
        redirectTo: "https://repofy-frontend.onrender.com/reset",
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
            setError("");
            setMessage("");
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

import React, { useState } from "react";
import supabase from "./supabase";

function AuthForm({ onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
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
            emailRedirectTo: "https://repofy-frontend.onrender.com"
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

      onAuthSuccess(session);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>{isSignUp ? "Sign Up" : "Log In"}</h2>

      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      <form onSubmit={handleSubmit}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={isSignUp && signUpDisabled}>
          {isSignUp ? "Sign Up" : "Log In"}
        </button>
      </form>

      <p>
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
            setMessage("");
            setSignUpDisabled(false); // 🔄 reset on toggle
          }}
        >
          {isSignUp ? "Log In" : "Sign Up"}
        </button>
      </p>
    </div>
  );
}

export default AuthForm;

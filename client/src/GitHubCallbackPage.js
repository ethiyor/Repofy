import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "./supabase";

function GitHubCallbackPage() {
  const [message, setMessage] = useState("Completing GitHub authentication...");
  const navigate = useNavigate();

  useEffect(() => {
    const handleGitHubCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("GitHub auth error:", error);
          setMessage("❌ Error during GitHub authentication. Please try again.");
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        if (session) {
          setMessage("✅ GitHub authentication successful! Redirecting...");
          
          // Trigger any additional setup needed for GitHub users
          // The session will be handled by the main app
          setTimeout(() => {
            navigate("/");
            // Refresh the page to ensure the session is properly loaded
            window.location.reload();
          }, 1500);
        } else {
          setMessage("❌ No session found. Please try logging in again.");
          setTimeout(() => navigate("/"), 3000);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setMessage("❌ Unexpected error occurred during authentication.");
        setTimeout(() => navigate("/"), 3000);
      }
    };

    // Small delay to ensure URL processing is complete
    const timer = setTimeout(handleGitHubCallback, 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div style={{ 
      padding: "2rem", 
      textAlign: "center", 
      maxWidth: "500px", 
      margin: "2rem auto",
      backgroundColor: "#f8f9fa",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
    }}>
      <div style={{ marginBottom: "1rem" }}>
        <span style={{ fontSize: "2rem" }}>🐙</span>
      </div>
      <h2 style={{ marginBottom: "1rem", color: "#24292e" }}>GitHub Authentication</h2>
      <p style={{ color: "#666", fontSize: "1.1rem" }}>{message}</p>
      
      {message.includes("❌") && (
        <p style={{ marginTop: "1rem" }}>
          <a 
            href="/" 
            style={{ 
              color: "#0366d6", 
              textDecoration: "none", 
              fontWeight: "bold",
              border: "1px solid #0366d6",
              padding: "8px 16px",
              borderRadius: "6px",
              display: "inline-block",
              marginTop: "1rem"
            }}
          >
            🔗 Return to App
          </a>
        </p>
      )}
    </div>
  );
}

export default GitHubCallbackPage;

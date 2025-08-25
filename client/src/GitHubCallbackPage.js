import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "./supabase";

function GitHubCallbackPage() {
  const [message, setMessage] = useState("Completing OAuth authentication...");
  const navigate = useNavigate();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        console.log('Processing OAuth callback...', window.location);
        
        // Check if we have a hash or search params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        console.log('Hash params:', Object.fromEntries(hashParams));
        console.log('Search params:', Object.fromEntries(searchParams));
        
        // Check for error in URL
        const error = hashParams.get('error') || searchParams.get('error');
        const errorDescription = hashParams.get('error_description') || searchParams.get('error_description');
        
        if (error) {
          console.error('OAuth error from URL:', error, errorDescription);
          setMessage(`❌ Authentication failed: ${errorDescription || error}`);
          setTimeout(() => navigate("/"), 5000);
          return;
        }
        
        // Try to get the current session
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          setMessage("❌ Error retrieving session. Please try again.");
          setTimeout(() => navigate("/"), 3000);
          return;
        }

        if (data?.session) {
          console.log('OAuth session found:', data.session.user);
          const provider = data.session.user.app_metadata?.provider || 'OAuth';
          setMessage(`✅ ${provider.charAt(0).toUpperCase() + provider.slice(1)} authentication successful! Redirecting...`);
          
          // Redirect back to main app
          setTimeout(() => {
            navigate("/");
            window.location.reload();
          }, 1500);
        } else {
          console.log('No session found, checking for tokens...');
          
          // Check for access token in URL
          const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
          
          if (accessToken) {
            console.log('Found access token in URL');
            setMessage("✅ Authentication successful! Redirecting...");
            setTimeout(() => {
              navigate("/");
              window.location.reload();
            }, 1500);
          } else {
            console.log('No session or tokens found');
            setMessage("❌ Authentication incomplete. Please try logging in again.");
            setTimeout(() => navigate("/"), 3000);
          }
        }
      } catch (err) {
        console.error("Unexpected error:", err);
        setMessage(`❌ Unexpected error: ${err.message}`);
        setTimeout(() => navigate("/"), 3000);
      }
    };

    // Process callback immediately
    handleOAuthCallback();
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
        <span style={{ fontSize: "2rem" }}>�</span>
      </div>
      <h2 style={{ marginBottom: "1rem", color: "#24292e" }}>OAuth Authentication</h2>
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

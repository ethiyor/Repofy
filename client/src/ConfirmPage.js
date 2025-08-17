import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "./supabase";

function ConfirmPage() {
  const [message, setMessage] = useState("Confirming your email...");
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the session after email confirmation
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setMessage("❌ Error confirming email. Please try again.");
          return;
        }

        if (session) {
          setMessage("✅ Email verified successfully! Redirecting...");
          setTimeout(() => {
            navigate("/");
          }, 2000);
        } else {
          setMessage("❌ No valid session found. Please try logging in.");
        }
      } catch (err) {
        setMessage("❌ Unexpected error occurred.");
      }
    };

    handleEmailConfirmation();
  }, [navigate]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Email Confirmation</h2>
      <p>{message}</p>
      <p>
        <a href="/" style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
          🔗 Go to App
        </a>
      </p>
    </div>
  );
}

export default ConfirmPage;

import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import supabase from "./supabase";

function PhoneConfirmPage() {
  const [message, setMessage] = useState("Confirming your phone number...");
  const [verificationCode, setVerificationCode] = useState("");
  const [phone, setPhone] = useState("");
  const [isManualVerification, setIsManualVerification] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check if we have URL parameters for phone verification
    const phoneParam = searchParams.get('phone');
    const tokenParam = searchParams.get('token');
    
    if (phoneParam && tokenParam) {
      // Automatic verification from URL
      handlePhoneConfirmation(phoneParam, tokenParam);
    } else {
      // Manual verification required
      setIsManualVerification(true);
      setMessage("Please enter your phone number and verification code:");
    }
  }, [searchParams]);

  const handlePhoneConfirmation = async (phoneNumber, token) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: token,
        type: 'sms'
      });
      
      if (error) {
        setMessage("❌ Error confirming phone number. Please try again.");
        setIsManualVerification(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setMessage("✅ Phone number verified successfully! Redirecting...");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } else {
        setMessage("❌ No valid session found. Please try logging in.");
      }
    } catch (err) {
      setMessage("❌ Unexpected error occurred.");
      setIsManualVerification(true);
    }
  };

  const handleManualVerification = async (e) => {
    e.preventDefault();
    
    if (!phone.trim() || !verificationCode.trim()) {
      setMessage("❌ Please enter both phone number and verification code.");
      return;
    }

    setMessage("Verifying...");
    await handlePhoneConfirmation(phone, verificationCode);
  };

  const resendCode = async () => {
    if (!phone.trim()) {
      setMessage("❌ Please enter your phone number first.");
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          channel: 'sms'
        }
      });

      if (error) throw error;
      setMessage("✅ New verification code sent!");
    } catch (err) {
      setMessage(`❌ Error sending code: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>Phone Number Confirmation</h2>
      <p>{message}</p>
      
      {isManualVerification && (
        <form onSubmit={handleManualVerification} style={{ maxWidth: "400px", margin: "0 auto" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>Phone Number:</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1234567890"
              style={{ 
                width: "100%", 
                padding: "0.5rem", 
                border: "1px solid #ccc", 
                borderRadius: "4px" 
              }}
              required
            />
          </div>
          
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem" }}>Verification Code:</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="123456"
              maxLength="6"
              style={{ 
                width: "100%", 
                padding: "0.5rem", 
                border: "1px solid #ccc", 
                borderRadius: "4px" 
              }}
              required
            />
          </div>
          
          <button 
            type="submit"
            style={{ 
              padding: "0.5rem 1rem", 
              backgroundColor: "#007bff", 
              color: "white", 
              border: "none", 
              borderRadius: "4px",
              marginRight: "0.5rem"
            }}
          >
            Verify
          </button>
          
          <button 
            type="button"
            onClick={resendCode}
            style={{ 
              padding: "0.5rem 1rem", 
              backgroundColor: "#6c757d", 
              color: "white", 
              border: "none", 
              borderRadius: "4px" 
            }}
          >
            Resend Code
          </button>
        </form>
      )}
      
      <p style={{ marginTop: "2rem" }}>
        <a href="/" style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
          🔗 Go to App
        </a>
      </p>
    </div>
  );
}

export default PhoneConfirmPage;

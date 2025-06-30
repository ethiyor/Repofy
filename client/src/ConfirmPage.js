import React from "react";

function ConfirmPage() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>✅ Email Verified</h2>
      <p>Your email has been successfully confirmed.</p>
      <p>
        Please click the link below to open the app:
      </p>
      <a href="http://localhost:3000" style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
        🔗 Go to App
      </a>
    </div>
  );
}

export default ConfirmPage;

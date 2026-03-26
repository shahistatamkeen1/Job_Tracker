import { useEffect } from "react";

export default function GmailCallback() {
  useEffect(() => {
    // Get authorization code from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      window.opener.postMessage(
        { type: "gmail-auth-error", error: error },
        window.location.origin
      );
    } else if (code) {
      // Exchange code for token on the backend
      fetch(`http://localhost:8000/api/auth/gmail/callback?code=${code}`)
        .then((res) => res.json())
        .then((data) => {
          window.opener.postMessage(
            { type: "gmail-auth-success", access_token: data.access_token },
            window.location.origin
          );
          window.close();
        })
        .catch((err) => {
          window.opener.postMessage(
            { type: "gmail-auth-error", error: err.message },
            window.location.origin
          );
          window.close();
        });
    }
  }, []);

  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <p>Processing Gmail authorization...</p>
    </div>
  );
}

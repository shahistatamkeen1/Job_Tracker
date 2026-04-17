import { useState } from "react";
import { api } from "../lib/api";

export default function GmailSync({ onSync }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleGmailLogin() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      console.log("Starting Gmail login process...");
      const { auth_url } = await api.getGmailAuthUrl();
      console.log("Got auth URL:", auth_url);

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        auth_url,
        "gmail-auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      console.log("Opened auth window");

      window.addEventListener("message", async (event) => {
        console.log("Received message:", event.data);
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "gmail-auth-success") {
          const { access_token } = event.data;
          console.log("Got access token, syncing Gmail...");

          try {
            const response = await api.syncGmail(access_token);
            console.log("Sync response:", response);
            setSuccess(`Successfully synced ${response.synced} job applications from Gmail!`);
            if (onSync) {
              onSync(response.jobs);
            }
          } catch (err) {
            console.error("Sync error:", err);
            setError(err.message);
          }
        } else if (event.data.type === "gmail-auth-error") {
          console.error("Auth error:", event.data.error);
          setError(event.data.error);
        }
      });

      if (!authWindow || authWindow.closed) {
        setError("Popup blocked. Please enable popups for this site and try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="gmail-sync-container">
      <h3>Import from Gmail</h3>
      <p>Automatically extract job applications from your Gmail inbox</p>

      <button onClick={handleGmailLogin} disabled={loading} className="sync-button">
        {loading ? "Connecting..." : "Connect Gmail"}
      </button>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
}
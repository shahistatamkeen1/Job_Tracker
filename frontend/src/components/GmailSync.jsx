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

      const { auth_url } = await api.getGmailAuthUrl();

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        auth_url,
        "gmail-auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      window.addEventListener("message", async (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "gmail-auth-success") {
          const { access_token } = event.data;

          try {
            const response = await api.syncGmail(access_token);
            setSuccess(`Successfully synced ${response.synced} job applications from Gmail!`);
            if (onSync) {
              onSync(response.jobs);
            }
          } catch (err) {
            setError(err.message);
          }
        } else if (event.data.type === "gmail-auth-error") {
          setError(event.data.error);
        }
      });

      if (!authWindow || authWindow.closed) {
        setError("Popup blocked. Please enable popups for this site and try again.");
      }
    } catch (err) {
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
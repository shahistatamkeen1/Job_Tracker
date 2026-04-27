import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function GmailSync({ onSync }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function handleMessage(event) {
      if (event.origin !== "http://localhost:8000") return;

      if (event.data?.type === "gmail-auth-success") {
        const { access_token } = event.data;

        try {
          setLoading(true);
          setError("");
          setSuccess("");

          const response = await api.syncGmail(access_token);

          setSuccess(response.message || `Synced ${response.synced} job applications from Gmail.`);

          if (onSync) {
            onSync(response.jobs || []);
          }
        } catch (err) {
          setError(err.message || "Failed to sync Gmail.");
        } finally {
          setLoading(false);
        }
      }

      if (event.data?.type === "gmail-auth-error") {
        setError(event.data.error || "Gmail authentication failed.");
        setLoading(false);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onSync]);

  async function handleGmailLogin() {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const { auth_url } = await api.getGmailAuthUrl();

      const width = 520;
      const height = 650;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        auth_url,
        "gmail-auth",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow || authWindow.closed) {
        setError("Popup blocked. Please enable popups and try again.");
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || "Gmail connection failed.");
      setLoading(false);
    }
  }

  return (
    <div className="gmail-sync-container">
      <h3>Import from Gmail</h3>
      <p>Automatically extract job applications from your Gmail inbox</p>

      <button onClick={handleGmailLogin} disabled={loading} className="sync-button">
        {loading ? "Syncing..." : "Connect Gmail"}
      </button>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
}
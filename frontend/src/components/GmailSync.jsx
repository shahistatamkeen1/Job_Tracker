import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export default function GmailSync({ onSync }) {
  const popupRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runGmailSync() {
    const response = await api.syncGmailApplications();
    const imported = response.applications || [];

    setMessage(response.message || "Gmail sync completed.");

    if (onSync) {
      onSync(imported);
    }
  }

  useEffect(() => {
    async function handleMessage(event) {
      if (
        event.origin !== "http://127.0.0.1:8000" &&
        event.origin !== "http://localhost:8000"
      ) {
        return;
      }

      if (event.data?.type === "gmail-auth-success") {
        try {
          setMessage("Gmail connected. Importing applications...");
          await runGmailSync();
        } catch (err) {
          setError(err.message || "Gmail import failed.");
        } finally {
          setLoading(false);
        }
      }

      if (event.data?.type === "gmail-auth-error") {
        setError(event.data.error || "Gmail authorization failed.");
        setLoading(false);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  async function handleConnectGmail() {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { auth_url } = await api.getGmailAuthUrl();

      if (!auth_url) {
        throw new Error("Gmail authorization URL was not returned.");
      }

      popupRef.current = window.open(
        auth_url,
        "gmail-auth",
        "width=560,height=720,left=500,top=100"
      );

      const timer = setInterval(() => {
        if (popupRef.current && popupRef.current.closed) {
          clearInterval(timer);
          setLoading(false);
        }
      }, 800);
    } catch (err) {
      setError(err.message || "Gmail connection failed.");
      setLoading(false);
    }
  }

  return (
    <div className="gmail-sync-container">
      <h3>Import from Gmail</h3>
      <p>Automatically extract real job applications from your Gmail inbox</p>

      <button
        onClick={handleConnectGmail}
        disabled={loading}
        className="sync-button"
      >
        {loading ? "Importing..." : "Connect Gmail"}
      </button>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
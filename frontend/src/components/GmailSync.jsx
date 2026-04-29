import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export default function GmailSync({ onSync }) {
  const popupRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    function handleMessage(event) {
      if (
        event.origin !== "http://127.0.0.1:8000" &&
        event.origin !== "http://localhost:8000"
      ) {
        return;
      }

      if (event.data?.type === "gmail-auth-success") {
        setSuccess("Gmail connected successfully.");
        setError("");
        setLoading(false);

        if (onSync) {
          onSync([]);
        }
      }

      if (event.data?.type === "gmail-auth-error") {
        setError(event.data.error || "Gmail authorization failed.");
        setSuccess("");
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
      }, 700);
    } catch (err) {
      setError(err.message || "Gmail connection failed.");
      setLoading(false);
    }
  }

  return (
    <div className="gmail-sync-container">
      <h3>Import from Gmail</h3>
      <p>Automatically extract job applications from your Gmail inbox</p>

      <button
        onClick={handleGmailLogin}
        disabled={loading}
        className="sync-button"
      >
        {loading ? "Connecting..." : "Connect Gmail"}
      </button>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
}
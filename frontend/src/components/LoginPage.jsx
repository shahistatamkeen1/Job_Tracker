import { useEffect, useState } from "react";

export default function LoginPage({ onLogin, onGoToRegister, onBackToLanding }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    window.google?.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleGoogleLogin,
    });

    window.google?.accounts.id.renderButton(document.getElementById("googleLoginBtn"), {
      theme: "outline",
      size: "large",
      width: "100%",
    });
  }, []);

  const handleGoogleLogin = async (response) => {
    try {
      const res = await fetch("http://localhost:8000/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: response.credential }),
      });

      const data = await res.json();

      if (data.email) {
        onLogin(data.email);
      } else {
        setError(data.detail || "Google login failed");
      }
    } catch (err) {
      setError("Error during Google login");
      console.error(err);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Please enter both email and password.");
      return;
    }

    setError("");
    onLogin(email.trim());
  };

  return (
    <div className="login-shell">
      <div className="bg-glow bg-glow-a" />
      <div className="bg-glow bg-glow-b" />
      <div className="bg-glow bg-glow-c" />

      <section className="login-card" aria-labelledby="login-title">
        <p className="login-kicker">WELCOME BACK</p>
        <h1 id="login-title">Sign in to your CareerPulse account</h1>
        <p className="login-subtitle">
          Manage applications, chat with AI, improve your resume, and keep your job search organized in one place.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />

          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" className="login-btn">
            Sign In
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <div id="googleLoginBtn" className="google-login-container"></div>

        <div className="auth-alt-actions">
          <button type="button" className="text-action-btn" onClick={onGoToRegister}>
            Create new account
          </button>

          <button type="button" className="text-action-btn" onClick={onBackToLanding}>
            Back to Landing Page
          </button>
        </div>
      </section>
    </div>
  );
}
import { useState } from "react";

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

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

      <section className="login-card" aria-labelledby="login-title">
        <p className="login-kicker">WELCOME BACK</p>
        <h1 id="login-title">Sign in to your Job Tracker</h1>
        <p className="login-subtitle">
          Manage applications, chat with AI, and optimize your resume in one place.
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
      </section>
    </div>
  );
}

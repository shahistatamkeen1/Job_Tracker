import { useState } from "react";

export default function RegisterPage({ onRegister, onGoToLogin, onBackToLanding }) {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim() || !form.confirmPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    onRegister(form.email.trim());
  }

  return (
    <div className="login-shell">
      <div className="bg-glow bg-glow-a" />
      <div className="bg-glow bg-glow-b" />
      <div className="bg-glow bg-glow-c" />

      <section className="login-card" aria-labelledby="register-title">
        <p className="login-kicker">CREATE ACCOUNT</p>
        <h1 id="register-title">Register for CareerPulse</h1>
        <p className="login-subtitle">
          Create your account to start tracking applications, improving resumes, and managing your job search in one place.
        </p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="register-fullname">
            Full Name
          </label>
          <input
            id="register-fullname"
            type="text"
            placeholder="Your full name"
            value={form.fullName}
            onChange={(e) => handleChange("fullName", e.target.value)}
          />

          <label className="field-label" htmlFor="register-email">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />

          <label className="field-label" htmlFor="register-password">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            placeholder="Create password"
            value={form.password}
            onChange={(e) => handleChange("password", e.target.value)}
          />

          <label className="field-label" htmlFor="register-confirm-password">
            Confirm Password
          </label>
          <input
            id="register-confirm-password"
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(e) => handleChange("confirmPassword", e.target.value)}
          />

          {error && <p className="error">{error}</p>}

          <button type="submit" className="login-btn">
            Create Account
          </button>
        </form>

        <div className="auth-alt-actions">
          <button type="button" className="text-action-btn" onClick={onGoToLogin}>
            Already have an account? Login
          </button>

          <button type="button" className="text-action-btn" onClick={onBackToLanding}>
            Back to Home Page
          </button>
        </div>
      </section>
    </div>
  );
}
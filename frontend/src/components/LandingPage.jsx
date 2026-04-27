const orbitItems = [
  ["Application Hub", "Track every role"],
  ["Career Copilot", "Understand each JD"],
  ["Resume Optimizer", "Improve ATS fit"],
  ["Skill Arena", "Practice interviews"],
  ["Progress Insight", "Monitor growth"],
  ["Career Profile", "Build your story"],
];

export default function LandingPage({ onGetStarted, onLoginClick }) {
  return (
    <div className="landing-v2">
      <div className="landing-topbar" />

      <header className="landing-navbar">
        <div className="landing-brand">
          <div className="landing-brand-logo">CF</div>
          <span>CareerForge</span>
        </div>

        <nav className="landing-nav-links">
          <a href="#overview">Overview</a>
          <a href="#features">Features</a>
          <a href="#how">How it Works</a>
          <a href="#benefits">Why CareerForge</a>
        </nav>

        <div className="landing-nav-actions">
          <button type="button" className="landing-login-btn" onClick={onLoginClick}>
            Login
          </button>
          <button type="button" className="landing-primary-btn" onClick={onGetStarted}>
            Get Started
          </button>
        </div>
      </header>

      <section className="landing-orbit-hero">
        <div className="landing-orbit-copy">
          <span className="landing-small-badge">AI Career Command Center</span>

          <h1>
            Forge every step of your
            <span> job search with AI.</span>
          </h1>

          <p>
            CareerForge turns job descriptions, resumes, applications, interview practice,
            and progress tracking into one guided workflow built for serious job seekers.
          </p>

          <div className="landing-cta-row">
            <button type="button" className="landing-primary-btn large" onClick={onGetStarted}>
              Start Forging
            </button>

            <a href="#features" className="landing-text-link">
              Explore workflow <span>→</span>
            </a>
          </div>

          <div className="orbit-proof-row">
            <div>
              <strong>6</strong>
              <span>connected tools</span>
            </div>
            <div>
              <strong>AI</strong>
              <span>guided preparation</span>
            </div>
            <div>
              <strong>Live</strong>
              <span>progress insight</span>
            </div>
          </div>
        </div>

        <div className="career-orbit-wrap">
          <div className="orbit-glow" />
          <div className="orbit-ring orbit-ring-one" />
          <div className="orbit-ring orbit-ring-two" />

          <div className="orbit-center">
            <span>CF</span>
            <strong>CareerForge AI</strong>
            <small>Your career operating system</small>
          </div>

          {orbitItems.map(([title, text], index) => (
            <div key={title} className={`orbit-card orbit-card-${index + 1}`}>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section-v2" id="overview">
        <div className="landing-section-label">Overview</div>
        <h2>A smarter career workspace</h2>
        <p>
          CareerForge helps users replace scattered job-search work with one intelligent
          system for applications, resumes, interviews, and progress.
        </p>
      </section>

      <section className="landing-section-v2" id="features">
        <div className="landing-section-label">Features</div>
        <h2>Everything connected in one workflow</h2>

        <div className="landing-feature-list-v2">
          {orbitItems.map(([title, text]) => (
            <div key={title} className="landing-feature-line">
              <span className="feature-check">✓</span>
              <span>
                <strong>{title}</strong> — {text}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-footer-cta">
        <h2>Start building your future with more clarity.</h2>
        <p>Track applications, improve resumes, and prepare for interviews with confidence.</p>
        <button type="button" className="landing-primary-btn large" onClick={onGetStarted}>
          Enter CareerForge
        </button>
      </section>
    </div>
  );
}
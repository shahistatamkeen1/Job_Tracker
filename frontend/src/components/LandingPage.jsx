const nodes = [
  ["jd", "Job Description", "Paste role details", "📌"],
  ["copilot", "Career Copilot", "Extract role insights", "✨"],
  ["resume", "Resume Optimizer", "Improve ATS match", "📄"],
  ["hub", "Application Hub", "Track pipeline", "💼"],
  ["insight", "Progress Insight", "Monitor activity", "📊"],
  ["arena", "Skill Arena", "Practice interviews", "🧠"],
];

export default function LandingPage({ onGetStarted, onLoginClick }) {
  return (
    <main className="cf-landing">
      <nav className="cf-nav">
        <div className="cf-brand">
          <div className="cf-logo">CF</div>
          <strong>CareerForge</strong>
        </div>

        <div className="cf-links">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <a href="#why">Why CareerForge</a>
        </div>

        <div className="cf-actions">
          <button className="cf-login" onClick={onLoginClick}>Login</button>
          <button className="cf-primary" onClick={onGetStarted}>Get Started</button>
        </div>
      </nav>

      <section className="cf-hero">
        <div className="cf-hero-inner">
          <div className="cf-copy">
            <span className="cf-badge">AI Career Workflow Builder</span>

            <h1>
              Turn your job search into an
              <span> intelligent workflow.</span>
            </h1>

            <p>
              CareerForge connects applications, resumes, job descriptions,
              interview practice, and progress tracking into one AI-powered
              career operating system.
            </p>

            <div className="cf-cta">
              <button className="cf-primary cf-large" onClick={onGetStarted}>
                Start Building
              </button>
              <a href="#workflow">See workflow →</a>
            </div>

            <div className="cf-stats">
              <div><strong>6</strong><span>career modules</span></div>
              <div><strong>AI</strong><span>guided decisions</span></div>
              <div><strong>Live</strong><span>progress insights</span></div>
            </div>
          </div>

          <div className="cf-canvas" id="workflow">
            <div className="cf-grid" />

            <svg className="cf-lines" viewBox="0 0 600 500">
              <path d="M300 90 L300 210" />
              <path d="M300 230 L500 155" />
              <path d="M300 250 L500 345" />
              <path d="M300 290 L300 410" />
              <path d="M300 250 L100 345" />
              <path d="M300 230 L100 155" />
            </svg>

            <div className="cf-core">
              <div className="cf-pulse" />
              <div className="cf-core-card">
                <span>CF</span>
                <strong>CareerForge AI</strong>
                <small>Routes your career workflow</small>
              </div>
            </div>

            {nodes.map(([id, title, text, icon], index) => (
              <div key={id} className={`cf-node cf-node-${index + 1}`}>
                <div className="cf-node-icon">{icon}</div>
                <div>
                  <strong>{title}</strong>
                  <span>{text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cf-section" id="features">
        <span className="cf-badge">Features</span>
        <h2>Everything your job search needs, connected.</h2>
      </section>

      <section className="cf-section cf-dark" id="why">
        <span className="cf-badge">Why CareerForge</span>
        <h2>Built for serious job seekers who want clarity.</h2>
        <p>
          Replace scattered spreadsheets, notes, resumes, and prep tabs with one
          visual AI workflow.
        </p>
        <button className="cf-primary cf-large" onClick={onGetStarted}>
          Enter CareerForge
        </button>
      </section>
    </main>
  );
}
import { useRef, useState } from "react";

const features = [
  "Track all job applications in one place",
  "Analyze resumes against job descriptions",
  "Get AI help for resume and job fit",
  "Manage profile, projects, and achievements",
  "Monitor progress with activity insights",
  "Import application emails from Gmail",
];

export default function LandingPage({ onGetStarted, onLoginClick }) {
  return (
    <div className="landing-v2">
      <div className="landing-topbar" />
      <header className="landing-navbar">
        <div className="landing-brand">
          <div className="landing-brand-logo">C</div>
          <span>CareerPulse</span>
        </div>

        <nav className="landing-nav-links">
          <a href="#overview">Overview</a>
          <a href="#features">Features</a>
          <a href="#how">How it Works</a>
          <a href="#benefits">Why CareerPulse</a>
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

      <section className="landing-hero-v2">
        <div className="landing-hero-copy-v2">
          <div className="landing-badge-row">
            <span className="landing-small-badge">AI Job Application Tracker</span>
          </div>

          <h1>
            All your job applications
            <br />
            in <span>one place</span>
          </h1>

          <p>
            CareerPulse helps you track applications, analyze resumes, improve ATS match,
            chat with AI about job descriptions, and stay organized throughout your
            job search journey.
          </p>

          <div className="landing-cta-row">
            <button type="button" className="landing-primary-btn large" onClick={onGetStarted}>
              Start Now
            </button>

            <a href="#features" className="landing-text-link">
              Learn more <span>→</span>
            </a>
          </div>

          <div className="landing-proof-card">
            <p>
              “CareerPulse gives job seekers one smart workspace to manage applications,
              improve resumes, and track progress with confidence.”
            </p>
            <strong>Built for students, job seekers, and professionals</strong>
          </div>
        </div>

        <div className="landing-hero-preview">
          <div className="preview-glow" />
          <div className="preview-window">
            <div className="preview-window-top">
              <div className="preview-dots">
                <span />
                <span />
                <span />
              </div>
              <div className="preview-title">CareerPulse Dashboard</div>
            </div>

            <div className="preview-toolbar">
              <div className="preview-brand-pill">CareerPulse</div>
              <div className="preview-score-pill">ATS Score 86%</div>
              <div className="preview-sync-pill">Synced</div>
            </div>

            <div className="preview-filter-row">
              <span>Source</span>
              <span>Job Title</span>
              <span>Company</span>
              <span>Status</span>
            </div>

            <div className="preview-status-grid">
              <div className="preview-status-card applied">
                <div className="preview-status-head">Applied (5)</div>
                <div className="preview-job-card">
                  <strong>Software Engineer Intern</strong>
                  <span>Amazon</span>
                </div>
                <div className="preview-job-card">
                  <strong>AI Intern</strong>
                  <span>ARCO/Murray</span>
                </div>
              </div>

              <div className="preview-status-card interview">
                <div className="preview-status-head">Interview (2)</div>
                <div className="preview-job-card">
                  <strong>Analytics Developer</strong>
                  <span>Northwestern Mutual</span>
                </div>
              </div>

              <div className="preview-status-card offer">
                <div className="preview-status-head">Offer (1)</div>
                <div className="preview-job-card">
                  <strong>Student Technician</strong>
                  <span>Elmhurst University</span>
                </div>
              </div>

              <div className="preview-status-card rejected">
                <div className="preview-status-head">Not Selected (1)</div>
                <div className="preview-job-card">
                  <strong>Data Analyst Intern</strong>
                  <span>Optum</span>
                </div>
              </div>
            </div>

            <div className="preview-bottom-panels">
              <div className="preview-mini-panel">
                <p>Weekly Activity</p>
                <div className="preview-bars">
                  <span style={{ height: "35%" }} />
                  <span style={{ height: "55%" }} />
                  <span style={{ height: "45%" }} />
                  <span style={{ height: "75%" }} />
                  <span style={{ height: "62%" }} />
                  <span style={{ height: "88%" }} />
                  <span style={{ height: "60%" }} />
                </div>
              </div>

              <div className="preview-mini-panel">
                <p>AI Recommendation</p>
                <div className="preview-reco-box">
                  Add stronger keywords from the job description and quantify project impact.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section-v2" id="overview">
        <div className="landing-section-label">Overview</div>
        <h2>What is CareerPulse?</h2>
        <p>
          CareerPulse is an AI-powered job search platform that helps users manage
          applications, improve resumes, organize profile details, and monitor job
          search progress in one modern workspace.
        </p>
      </section>

      <section className="landing-section-v2" id="features">
        <div className="landing-section-label">Features</div>
        <h2>Everything needed in one workflow</h2>

        <div className="landing-feature-list-v2">
          {features.map((feature) => (
            <div key={feature} className="landing-feature-line">
              <span className="feature-check">✓</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section-v2" id="how">
        <div className="landing-section-label">How it Works</div>
        <h2>Simple process, smarter job search</h2>

        <div className="landing-steps-v2">
          <div className="landing-step-v2">
            <strong>01</strong>
            <p>Build your profile and upload your resume</p>
          </div>
          <div className="landing-step-v2">
            <strong>02</strong>
            <p>Track every application in one dashboard</p>
          </div>
          <div className="landing-step-v2">
            <strong>03</strong>
            <p>Use AI to improve resume-job alignment</p>
          </div>
          <div className="landing-step-v2">
            <strong>04</strong>
            <p>Stay consistent with analytics and insights</p>
          </div>
        </div>
      </section>

      <section className="landing-section-v2" id="benefits">
        <div className="landing-section-label">Why CareerPulse</div>
        <h2>Built for a more organized and confident application journey</h2>

        <div className="landing-benefits-v2">
          <div>
            <h3>Centralized workflow</h3>
            <p>No need for separate notes, trackers, emails, and resume tools.</p>
          </div>
          <div>
            <h3>AI-powered support</h3>
            <p>Get practical guidance for ATS fit, resume improvement, and job understanding.</p>
          </div>
          <div>
            <h3>Cleaner organization</h3>
            <p>Keep job search progress structured, visible, and easy to manage.</p>
          </div>
          <div>
            <h3>Professional experience</h3>
            <p>A modern interface that feels like a real premium SaaS product.</p>
          </div>
        </div>
      </section>

      <section className="landing-footer-cta">
        <h2>Start managing your job search with more clarity.</h2>
        <p>Track applications, improve resumes, and move forward with confidence.</p>
        <button type="button" className="landing-primary-btn large" onClick={onGetStarted}>
          Enter CareerPulse
        </button>
      </section>
    </div>
  );
}
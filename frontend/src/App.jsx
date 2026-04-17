import { useEffect, useMemo, useState } from "react";
import JobTracker from "./components/JobTracker";
import AIChat from "./components/AIChat";
import ATSResume from "./components/ATSResume";
import ActivityAnalyze from "./components/ActivityAnalyze";
import UserProfile from "./components/UserProfile";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import NavBar from "./components/NavBar";
import LandingPage from "./components/LandingPage";
import GmailCallbackHandler from "./components/GmailCallbackHandler";

const tabs = [
  { key: "profile", label: "Profile" },
  { key: "tracker", label: "Applications" },
  { key: "chat", label: "AI JD Chat" },
  { key: "ats", label: "ATS Resume" },
  { key: "debuglab", label: "AI Debug Lab" },
  { key: "activity", label: "Activity Analyze" },
];

export default function App() {
  const [page, setPage] = useState("landing");
  const [userEmail, setUserEmail] = useState(
    () => localStorage.getItem("jobTrackerUser") || ""
  );
  const [activeTab, setActiveTab] = useState("tracker");

  const headline = useMemo(() => {
    if (activeTab === "profile") {
      return "Keep your candidate profile polished, complete, and ready to share.";
    }
    if (activeTab === "tracker") {
      return "Track every application with a clean pipeline and instant insights.";
    }
    if (activeTab === "chat") {
      return "Turn every job description into clear next steps with AI support.";
    }
    if (activeTab === "ats") {
      return "Measure resume strength, identify gaps, and improve ATS matching faster.";
    }
    if (activeTab === "debuglab") {
      return "Practice debugging broken interview code with AI hints and test cases.";
    }
    return "See your search momentum, effort, and consistency at a glance.";
  }, [activeTab]);

  // Check if this is a Gmail callback
  const isGmailCallback = window.location.search.includes('code=') && window.location.search.includes('state=');

  if (isGmailCallback) {
    return <GmailCallbackHandler />;
  }
      setPage("app");
    }
  }, [userEmail]);

  useEffect(() => {
    if (page === "app") {
      logActivity("tab_opened", { tab: activeTab });
    }
  }, [activeTab, page]);

  const handleLogin = (email) => {
    setUserEmail(email);
    localStorage.setItem("jobTrackerUser", email);
    setPage("app");
  };

  const handleRegister = (email) => {
    setUserEmail(email);
    localStorage.setItem("jobTrackerUser", email);
    setPage("app");
  };

  const handleLogout = () => {
    setUserEmail("");
    localStorage.removeItem("jobTrackerUser");
    setPage("landing");
  };

  if (page === "landing") {
    return (
      <LandingPage
        onGetStarted={() => setPage("register")}
        onLoginClick={() => setPage("login")}
      />
    );
  }

  if (page === "login") {
    return (
      <LoginPage
        onLogin={handleLogin}
        onGoToRegister={() => setPage("register")}
        onBackToLanding={() => setPage("landing")}
      />
    );
  }

  if (page === "register") {
    return (
      <RegisterPage
        onRegister={handleRegister}
        onGoToLogin={() => setPage("login")}
        onBackToLanding={() => setPage("landing")}
      />
    );
  }

  return (
    <div className="app-shell">
      <div className="bg-glow bg-glow-a" />
      <div className="bg-glow bg-glow-b" />
      <div className="bg-glow bg-glow-c" />

      <NavBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userEmail={userEmail}
        onLogout={handleLogout}
        onOpenProfile={() => setActiveTab("profile")}
      />

      <section className="app-intro-card">
        <div>
          <span className="app-eyebrow">CareerPulse Workspace</span>
          <h1 className="app-title">Modern job tracking with a premium SaaS feel.</h1>
          <p className="app-intro">{headline}</p>
        </div>
        <div className="app-status-chip">Live workflow</div>
      </section>

      <main className="content-panel">
        {activeTab === "profile" && <UserProfile userEmail={userEmail} />}
        {activeTab === "tracker" && <JobTracker />}
        {activeTab === "chat" && <AIChat />}
        {activeTab === "ats" && <ATSResume userEmail={userEmail} />}
        {activeTab === "debuglab" && <AIDebugLab />}
        {activeTab === "activity" && <ActivityAnalyze />}
      </main>
    </div>
  );
}
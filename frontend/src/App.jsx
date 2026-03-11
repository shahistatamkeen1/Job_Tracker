import { useMemo, useState } from "react";
import JobTracker from "./components/JobTracker";
import AIChat from "./components/AIChat";
import ATSResume from "./components/ATSResume";

const tabs = [
  { key: "tracker", label: "Applications" },
  { key: "chat", label: "AI JD Chat" },
  { key: "ats", label: "ATS Resume" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("tracker");
  const headline = useMemo(() => {
    if (activeTab === "tracker") return "Track every application and update outcomes";
    if (activeTab === "chat") return "Ask AI anything about a Job Description";
    return "Generate ATS-ready resume improvements with score";
  }, [activeTab]);

  return (
    <div className="app-shell">
      <div className="bg-glow bg-glow-a" />
      <div className="bg-glow bg-glow-b" />
      <header className="topbar">
        <h1>AI Job Application Tracker</h1>
        <p>{headline}</p>
      </header>

      <nav className="tabs" aria-label="Main Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="content-panel">
        {activeTab === "tracker" && <JobTracker />}
        {activeTab === "chat" && <AIChat />}
        {activeTab === "ats" && <ATSResume />}
      </main>
    </div>
  );
}

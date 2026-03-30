import { useEffect, useMemo, useState } from "react";
import JobTracker from "./components/JobTracker";
import AIChat from "./components/AIChat";
import ATSResume from "./components/ATSResume";
import ActivityAnalyze from "./components/ActivityAnalyze";
import UserProfile from "./components/UserProfile";
import LoginPage from "./components/LoginPage";
import NavBar from "./components/NavBar";
import AIDebugLab from "./components/AIDebugLab";
import { logActivity } from "./lib/activity";

const tabs = [
  { key: "profile", label: "Profile" },
  { key: "tracker", label: "Applications" },
  { key: "chat", label: "AI JD Chat" },
  { key: "ats", label: "ATS Resume" },
  { key: "debuglab", label: "AI Debug Lab" },
  { key: "activity", label: "Activity Analyze" },
];

export default function App() {
  const [userEmail, setUserEmail] = useState(
    () => localStorage.getItem("jobTrackerUser") || ""
  );
  const [activeTab, setActiveTab] = useState("tracker");

  const headline = useMemo(() => {
    if (activeTab === "profile") {
      return "Professional profile view with career activity highlights";
    }
    if (activeTab === "tracker") {
      return "Track every application and update outcomes";
    }
    if (activeTab === "chat") {
      return "Ask AI anything about a Job Description";
    }
    if (activeTab === "ats") {
      return "Generate ATS-ready resume improvements with score";
    }
    if (activeTab === "debuglab") {
      return "Practice debugging broken interview code with AI hints and test cases";
    }
    return "Measure consistency and dedication across your job search";
  }, [activeTab]);

  useEffect(() => {
    logActivity("tab_opened", { tab: activeTab });
  }, [activeTab]);

  const handleLogin = (email) => {
    setUserEmail(email);
    localStorage.setItem("jobTrackerUser", email);
  };

  const handleLogout = () => {
    setUserEmail("");
    localStorage.removeItem("jobTrackerUser");
  };

  if (!userEmail) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <div className="bg-glow bg-glow-a" />
      <div className="bg-glow bg-glow-b" />

      <NavBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userEmail={userEmail}
        onLogout={handleLogout}
        onOpenProfile={() => setActiveTab("profile")}
      />

      <p className="app-intro">{headline}</p>

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
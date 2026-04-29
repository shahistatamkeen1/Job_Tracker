import { useState } from "react";

const TAB_LABELS = {
  profile: "Profile",
  tracker: "Application Hub",
  chat: "Career Copilot",
  ats: "Resume Optimizer",
  debuglab: "Skill Arena",
  activity: "Progress Insight",
};

const TAB_ICONS = {
  profile: "👤",
  tracker: "💼",
  chat: "✨",
  ats: "📄",
  debuglab: "🧠",
  activity: "📊",
};

export default function NavBar({
  tabs,
  activeTab,
  onTabChange,
  userEmail,
  onLogout,
  onOpenProfile,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const initials =
    userEmail
      ?.split("@")[0]
      ?.split(/[._-]/)
      ?.filter(Boolean)
      ?.slice(0, 2)
      ?.map((part) => part[0]?.toUpperCase() || "")
      ?.join("") || "U";

  const userName =
    userEmail
      ?.split("@")[0]
      ?.split(/[._-]/)
      ?.filter(Boolean)
      ?.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      ?.join(" ") || "User";

  return (
    <header className="top-nav top-nav-modern" aria-label="Main Navigation">
      <div className="top-nav-brand">
        <button
          type="button"
          className="avatar-badge brand-badge"
          aria-label="Open profile"
          onClick={onOpenProfile}
        >
          CF
        </button>

        <div className="brand-copy">
          <p className="brand-label">CareerForge</p>
        </div>
      </div>

      <button
  className="mobile-nav-toggle"
  onClick={() => setMobileMenuOpen((prev) => !prev)}
>
  {mobileMenuOpen ? "Close" : "Menu"}
</button>

      <nav
  className={`top-nav-tabs modern-tabs ${mobileMenuOpen ? "mobile-open" : ""}`}
  aria-label="Feature Tabs"
>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`top-nav-tab modern-tab ${
              activeTab === tab.key ? "active" : ""
            }`}
            onClick={() => {
  onTabChange(tab.key);
  setMobileMenuOpen(false);
}}
          >
            <span className="tab-icon">{TAB_ICONS[tab.key] || "•"}</span>
            <span>{TAB_LABELS[tab.key] || tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="top-nav-user modern-user">
        <button
          type="button"
          className="avatar-badge user-avatar-mini"
          aria-label="Open profile"
          onClick={onOpenProfile}
        >
          {initials.slice(0, 1)}
        </button>

        <button
          type="button"
          className="logout-btn secondary-btn modern-logout"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
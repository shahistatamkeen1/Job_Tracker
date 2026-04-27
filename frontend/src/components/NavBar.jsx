export default function NavBar({
  tabs,
  activeTab,
  onTabChange,
  userEmail,
  onLogout,
  onOpenProfile,
}) {
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

  const getTabIcon = (key) => {
    switch (key) {
      case "profile":
        return "👤";
      case "tracker":
        return "💼";
      case "chat":
        return "✨";
      case "ats":
        return "📄";
      case "debuglab":
        return "🐞";
      case "activity":
        return "📈";
      default:
        return "•";
    }
  };

  return (
    <header className="top-nav top-nav-modern" aria-label="Main Navigation">
      <div className="top-nav-brand">
        <button
          type="button"
          className="avatar-badge brand-badge"
          aria-label="Open profile"
          onClick={onOpenProfile}
        >
          CP
        </button>

<div className="brand-copy">
  <p className="brand-label">CareerPulse</p>
</div>
      </div>

      <nav className="top-nav-tabs modern-tabs" aria-label="Feature Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`top-nav-tab modern-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            <span className="tab-icon">{getTabIcon(tab.key)}</span>
            <span>{tab.label}</span>
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

        <div className="top-nav-user-copy">
          <span className="user-name">{userName}</span>
          <span className="user-email">{userEmail}</span>
        </div>

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
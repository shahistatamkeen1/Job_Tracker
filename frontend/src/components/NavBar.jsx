export default function NavBar({ tabs, activeTab, onTabChange, userEmail, onLogout, onOpenProfile }) {
  const initials = userEmail
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  const userName = userEmail
    .split("@")[0]
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .toUpperCase();

  return (
    <header className="top-nav" aria-label="Main Navigation">
      <button
        type="button"
        className="avatar-badge"
        aria-label="Open profile"
        onClick={onOpenProfile}
      >
        {initials}
      </button>

      <nav className="top-nav-tabs" aria-label="Feature Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`top-nav-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="top-nav-user">
        <span className="user-name">{userName}</span>
        <button type="button" className="logout-btn" onClick={onLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}

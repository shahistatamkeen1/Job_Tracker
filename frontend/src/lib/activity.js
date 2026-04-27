const ACTIVITY_LOG_KEY = "jobTrackerActivityLog";
const MAX_ENTRIES = 800;

export function getActivityLog() {
  try {
    const raw = localStorage.getItem(ACTIVITY_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function logActivity(type, meta = {}) {
  const nextEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    at: new Date().toISOString(),
    page: window.location.pathname,
    ...meta,
  };

  const current = getActivityLog();
  const next = [nextEntry, ...current].slice(0, MAX_ENTRIES);

  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(next));

  // real-time update without refresh
  window.dispatchEvent(
    new CustomEvent("activity:new", {
      detail: nextEntry,
    })
  );
}

export function clearActivityLog() {
  localStorage.removeItem(ACTIVITY_LOG_KEY);
  window.dispatchEvent(new CustomEvent("activity:cleared"));
}
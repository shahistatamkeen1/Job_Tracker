import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api";
import { getActivityLog } from "../lib/activity";

const SEEN_KEY = "jobTrackerSeenBadges";

const safeJson = (key, fallback = []) => {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(data) ? data : fallback;
  } catch {
    return fallback;
  }
};

const saveSeen = (ids) => localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
const dayKey = (date) => new Date(date).toISOString().slice(0, 10);
const shortDay = (date) => new Date(date).toLocaleDateString(undefined, { weekday: "short" });
const actionText = (type) => String(type || "activity").replaceAll("_", " ");

const progressEmoji = (n) => (n >= 100 ? "😁" : n >= 75 ? "😄" : n >= 45 ? "🙂" : n >= 20 ? "😐" : "🥲");
const scoreEmoji = (n) => (n >= 80 ? "😎" : n >= 55 ? "😄" : n >= 30 ? "🙂" : "😅");
const mood = (n) => (n >= 100 ? "mood-max" : n >= 75 ? "mood-high" : n >= 45 ? "mood-mid" : "mood-low");
const dailyEmoji = (n) => (n >= 6 ? "😄" : n >= 3 ? "🙂" : n >= 1 ? "😐" : "😴");

function calcStreak(days) {
  let streak = 0;
  const d = new Date();

  while (days.has(d.toISOString().slice(0, 10))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }

  return streak;
}

function getLevel(score) {
  const levels = [
    ["Starter", 0, 30],
    ["Momentum Builder", 30, 55],
    ["Consistent Performer", 55, 80],
    ["Job Hunt Champion", 80, 100],
  ];

  const [name, min, next] = [...levels].reverse().find(([, start]) => score >= start) || levels[0];
  const progress = Math.min(100, Math.round(((score - min) / Math.max(1, next - min)) * 100));

  return { name, min, next, progress, isMax: next === 100 && score >= 100 };
}

function minutesAgo(date) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
}

export default function ActivityAnalyze() {
  const [jobs, setJobs] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastQueue, setToastQueue] = useState([]);
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const refreshActivity = () => setActivity(getActivityLog());

    const loadJobs = async () => {
      try {
        setError("");
        const data = await api.listJobs();
        if (!cancelled) setJobs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Unable to load jobs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadJobs();
    refreshActivity();

    const activityTimer = setInterval(refreshActivity, 5000);
    const jobTimer = setInterval(loadJobs, 15000);

    window.addEventListener("activity:new", refreshActivity);
    window.addEventListener("activity:cleared", refreshActivity);
    window.addEventListener("storage", refreshActivity);

    return () => {
      cancelled = true;
      clearInterval(activityTimer);
      clearInterval(jobTimer);
      window.removeEventListener("activity:new", refreshActivity);
      window.removeEventListener("activity:cleared", refreshActivity);
      window.removeEventListener("storage", refreshActivity);
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    const weekFloor = weekStart.toISOString().slice(0, 10);

    const countByType = activity.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    const todayActivity = activity.filter((x) => dayKey(x.at) === today);
    const weekActivity = activity.filter((x) => dayKey(x.at) >= weekFloor);
    const activeDays = new Set(activity.map((x) => dayKey(x.at)));

    const applied = countByType.job_applied || 0;
    const resumeRuns = countByType.resume_analyze || 0;
    const chatSent = countByType.chat_message_sent || 0;
    const statusUpdates = countByType.status_update || 0;

    const score = Math.min(
      100,
      Math.round(applied * 12 + resumeRuns * 15 + chatSent * 4 + statusUpdates * 3 + activeDays.size * 8)
    );

    const statusCounts = jobs.reduce(
      (acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      },
      { applied: 0, interview: 0, rejected: 0, offer: 0 }
    );

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toISOString().slice(0, 10);
      return {
        key,
        label: shortDay(key),
        count: activity.filter((x) => dayKey(x.at) === key).length,
      };
    });

    const breakdown = [
      { name: "Applications", value: applied, color: "#cc5a2d" },
      { name: "Resume Analyze", value: resumeRuns, color: "#1f7a6f" },
      { name: "Chat Questions", value: chatSent, color: "#2d6dcc" },
      { name: "Status Updates", value: statusUpdates, color: "#8a5ccc" },
    ];

    const totalBreakdown = breakdown.reduce((sum, item) => sum + item.value, 0);
    const donutData = totalBreakdown
      ? breakdown.filter((x) => x.value > 0)
      : [{ name: "No Activity Yet", value: 1, color: "#d6cbb8" }];

    const streak = calcStreak(activeDays);
    const level = getLevel(score);

    const achievements = [
      ["first-application", "First Application", "Applied to at least 1 job", applied >= 1],
      ["resume-grinder", "Resume Grinder", "Completed 3 resume analyses", resumeRuns >= 3],
      ["focused-week", "Focused Week", "Maintained a 3-day streak", streak >= 3],
      ["high-volume", "High Volume", "Logged 25 total actions", activity.length >= 25],
      ["interview-ready", "Interview Ready", "Reached interview stage", statusCounts.interview >= 1],
      ["offer-closer", "Offer Closer", "Received an offer", statusCounts.offer >= 1],
    ].map(([id, title, description, unlocked]) => ({ id, title, description, unlocked }));

    const latest = activity[0];
    const lastActiveMinutes = latest ? minutesAgo(latest.at) : null;
    const liveStatus =
      !latest ? "No activity yet" : lastActiveMinutes <= 2 ? "Active now" : lastActiveMinutes <= 15 ? "Recently active" : "Idle";

    const dailyTarget = 5;
    const dailyProgress = Math.min(100, Math.round((todayActivity.length / dailyTarget) * 100));
    const weeklyTarget = 15;
    const weeklyProgress = Math.min(100, Math.round((weekActivity.length / weeklyTarget) * 100));

    const focusScore = Math.min(
      100,
      (countByType.job_applied || 0) * 25 +
        (countByType.resume_analyze || 0) * 20 +
        (countByType.chat_message_sent || 0) * 8 +
        (countByType.status_update || 0) * 5
    );

    const label = score >= 80 ? "Very Dedicated" : score >= 55 ? "Consistent" : score >= 30 ? "Building Momentum" : "Needs Consistency";

    const appreciation =
      score >= 80
        ? "Elite consistency. Your disciplined effort is compounding into real opportunities."
        : score >= 55
        ? "Excellent rhythm. Keep this pace and interviews should follow."
        : score >= 30
        ? "Great momentum. You are building a reliable career growth routine."
        : "Every step counts. A few focused actions each day will quickly raise your score.";

    const alerts = [];
    if (!todayActivity.length) alerts.push("No job-search activity detected today.");
    if (lastActiveMinutes !== null && lastActiveMinutes > 60) alerts.push("You have been idle for more than 1 hour.");
    if (statusCounts.rejected > statusCounts.interview && statusCounts.rejected >= 3) {
      alerts.push("Rejections are higher than interviews. Resume targeting may need improvement.");
    }
    if (!alerts.length) alerts.push("No major risk detected. Your activity pattern looks healthy.");

    return {
      score,
      label,
      level,
      streak,
      applied,
      resumeRuns,
      chatSent,
      statusUpdates,
      statusCounts,
      last7Days,
      donutData,
      totalBreakdown,
      achievements,
      unlockedCount: achievements.filter((x) => x.unlocked).length,
      appreciation,
      todayCount: todayActivity.length,
      weekCount: weekActivity.length,
      totalActions: activity.length,
      liveStatus,
      lastActiveMinutes,
      dailyTarget,
      weeklyTarget,
      dailyProgress,
      weeklyProgress,
      focusScore,
      alerts,
    };
  }, [activity, jobs]);

  useEffect(() => {
    if (loading || !stats.achievements.length) return;

    const seen = safeJson(SEEN_KEY);
    const unlocked = stats.achievements.filter((x) => x.unlocked);
    const newlyUnlocked = unlocked.filter((x) => !seen.includes(x.id));

    if (newlyUnlocked.length) {
      setToastQueue((prev) => [...prev, ...newlyUnlocked]);
      saveSeen([...new Set([...seen, ...unlocked.map((x) => x.id)])]);
    }
  }, [loading, stats.achievements]);

  useEffect(() => {
    if (activeToast || !toastQueue.length) return;
    const [next, ...rest] = toastQueue;
    setActiveToast(next);
    setToastQueue(rest);
  }, [activeToast, toastQueue]);

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => setActiveToast(null), 3200);
    return () => clearTimeout(timer);
  }, [activeToast]);

  const levelEmoji = progressEmoji(stats.level.progress);
  const todayEmoji = progressEmoji(stats.dailyProgress);
  const weekEmoji = progressEmoji(stats.weeklyProgress);

  return (
    <section className="activity-stack">
      {activeToast && (
        <div className="unlock-toast" role="status" aria-live="polite">
          <strong>🎉 Badge Unlocked</strong>
          <span>{activeToast.title}</span>
        </div>
      )}

      <article className="card">
        <div className="monitor-header">
          <div>
            <h2>Activity Analyze</h2>
            <p className="muted-text">Real-time monitoring of your job-search activity.</p>
          </div>

          <div className={`live-indicator ${stats.liveStatus === "Active now" ? "online" : "idle"}`}>
            <span className="live-dot" />
            {stats.liveStatus}
          </div>
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p>Loading activity...</p>
        ) : (
          <div className="activity-grid">
            <div className="activity-stat">
              <p>Dedication Score</p>
              <strong>{stats.score}/100</strong>
              <span>{stats.label}</span>
            </div>

            <div className="activity-stat">
              <p>Current Streak</p>
              <strong>{stats.streak} days</strong>
              <span>Consecutive active days</span>
            </div>

            <div className="activity-stat">
              <p>Actions Today</p>
              <strong>{stats.todayCount}</strong>
              <span>{stats.todayCount}/{stats.dailyTarget} daily goal</span>
            </div>

            <div className="activity-stat">
              <p>Last Active</p>
              <strong>
                {stats.lastActiveMinutes === null
                  ? "Not yet"
                  : stats.lastActiveMinutes === 0
                  ? "Now"
                  : `${stats.lastActiveMinutes}m ago`}
              </strong>
              <span>Recent monitoring</span>
            </div>
          </div>
        )}
      </article>

      <article className="card appreciation-card">
        <h2>Recognition Hub</h2>
        <p className="appreciation-message">{stats.appreciation}</p>

        <div className="level-row">
          <div className="level-chip">
            <span>Current Level</span>
            <strong>{stats.level.name}</strong>
          </div>

          <div className="level-progress">
            <div className="progress-topline">
              <span>Level Progress</span>
              <span>
                {stats.level.progress}% {scoreEmoji(stats.score)}
              </span>
            </div>

            <div
              className={`progress-track with-emoji ${mood(stats.level.progress)}`}
              style={{ "--progress": `${Math.max(3, stats.level.progress)}%` }}
            >
              <div className="progress-fill" style={{ width: `${stats.level.progress}%` }} />
              <span key={levelEmoji} className="progress-emoji bounce-in" aria-hidden="true">
                {levelEmoji}
              </span>
            </div>

            <small>
              {stats.level.isMax ? "Maximum level reached" : `Reach ${stats.level.next}/100 dedication score for the next level`}
            </small>
          </div>
        </div>

        <div className="quest-grid">
          {[
            ["Daily Quest", stats.todayCount, stats.dailyTarget, stats.dailyProgress, todayEmoji],
            ["Weekly Quest", stats.weekCount, stats.weeklyTarget, stats.weeklyProgress, weekEmoji],
          ].map(([title, count, target, progress, emoji]) => (
            <div className="quest-card" key={title}>
              <p>{title}</p>
              <strong>
                {count}/{target} actions
              </strong>

              <div className={`progress-track thin with-emoji ${mood(progress)}`} style={{ "--progress": `${Math.max(3, progress)}%` }}>
                <div className="progress-fill" style={{ width: `${progress}%` }} />
                <span key={`${title}-${emoji}`} className="progress-emoji bounce-in" aria-hidden="true">
                  {emoji}
                </span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="badge-title">
          Achievements ({stats.unlockedCount}/{stats.achievements.length})
        </h3>

        <div className="badge-grid">
          {stats.achievements.map((badge) => (
            <div key={badge.id} className={`badge-item ${badge.unlocked ? "unlocked" : "locked"}`}>
              <strong>{badge.title}</strong>
              <span>{badge.description}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h2>Activity Charts</h2>

        <div className="charts-grid">
          <div className="chart-panel">
            <h3>Daily Momentum (Last 7 Days)</h3>

            <div className="rechart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={stats.last7Days} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="momentumFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1f7a6f" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#1f7a6f" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="5 5" stroke="#d8cdb9" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value) => [`${value} actions`, "Momentum"]} />

                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="count"
                    name="Actions"
                    stroke="#1f7a6f"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#momentumFill)"
                    activeDot={{ r: 6, fill: "#165f56" }}
                    dot={({ cx, cy, payload }) =>
                      typeof cx === "number" && typeof cy === "number" ? (
                        <g>
                          <circle cx={cx} cy={cy} r={4} fill="#1f7a6f" />
                          <text x={cx} y={cy - 10} textAnchor="middle" fontSize="11">
                            {dailyEmoji(payload.count)}
                          </text>
                        </g>
                      ) : null
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-panel">
            <h3>Action Breakdown</h3>

            <div className="rechart-wrap">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    isAnimationActive={false}
                    data={stats.donutData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={84}
                    paddingAngle={2}
                  >
                    {stats.donutData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>

                  <Tooltip />
                  {stats.totalBreakdown > 0 && <Legend verticalAlign="bottom" height={36} />}
                </PieChart>
              </ResponsiveContainer>

              {stats.totalBreakdown === 0 && <p className="chart-empty-note">Add activity to reveal your action split donut chart.</p>}
            </div>
          </div>
        </div>
      </article>

      <article className="card">
        <h2>Real-Time Risk Alerts</h2>

        <div className="alert-list">
          {stats.alerts.map((alert, index) => (
            <div key={`${alert}-${index}`} className="monitor-alert">
              <span>{alert.includes("No major") ? "✅" : "⚠️"}</span>
              <p>{alert}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="card">
        <h2>Work Habits Snapshot</h2>

        <div className="pill-row">
          <span className="pill">applications logged: {stats.applied}</span>
          <span className="pill">resume analyses: {stats.resumeRuns}</span>
          <span className="pill">chat questions: {stats.chatSent}</span>
          <span className="pill">status updates: {stats.statusUpdates}</span>
        </div>

        <div className="pill-row">
          <span className="pill applied">applied: {stats.statusCounts.applied}</span>
          <span className="pill interview">interview: {stats.statusCounts.interview}</span>
          <span className="pill rejected">rejected: {stats.statusCounts.rejected}</span>
          <span className="pill offer">offer: {stats.statusCounts.offer}</span>
        </div>

        <p>Total tracked actions: {stats.totalActions}</p>
      </article>

      <article className="card">
        <h2>Recent Activity</h2>

        {activity.length === 0 ? (
          <p>No activity yet. Start applying, chatting, or analyzing your resume.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {activity.slice(0, 12).map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.at).toLocaleString()}</td>
                    <td>{actionText(entry.type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
    </section>
  );
}
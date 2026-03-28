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

const SEEN_BADGES_KEY = "jobTrackerSeenBadges";

function getSeenBadges() {
  try {
    const raw = localStorage.getItem(SEEN_BADGES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setSeenBadges(ids) {
  localStorage.setItem(SEEN_BADGES_KEY, JSON.stringify(ids));
}

function dayKey(dateString) {
  return new Date(dateString).toISOString().slice(0, 10);
}

function calcStreak(keysSet) {
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!keysSet.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function shortDayLabel(dateString) {
  return new Date(dateString).toLocaleDateString(undefined, { weekday: "short" });
}

function getLevelDetails(score) {
  const levels = [
    { name: "Starter", min: 0, next: 30 },
    { name: "Momentum Builder", min: 30, next: 55 },
    { name: "Consistent Performer", min: 55, next: 80 },
    { name: "Job Hunt Champion", min: 80, next: 100 },
  ];

  const current = [...levels].reverse().find((lvl) => score >= lvl.min) || levels[0];
  const target = current.next;
  const range = Math.max(1, target - current.min);
  const progressValue = Math.max(0, score - current.min);
  const progress = Math.min(100, Math.round((progressValue / range) * 100));

  return {
    ...current,
    progress,
    target,
    isMax: current.next === 100 && score >= 100,
  };
}

function getProgressEmoji(percent) {
  if (percent >= 100) return "😁";
  if (percent >= 75) return "😄";
  if (percent >= 45) return "🙂";
  if (percent >= 20) return "😐";
  return "🥲";
}

function getScoreEmoji(score) {
  if (score >= 80) return "😎";
  if (score >= 55) return "😄";
  if (score >= 30) return "🙂";
  return "😅";
}

function getProgressMood(percent) {
  if (percent >= 100) return "mood-max";
  if (percent >= 75) return "mood-high";
  if (percent >= 45) return "mood-mid";
  return "mood-low";
}

function getDailyEmoji(count) {
  if (count >= 6) return "😄";
  if (count >= 3) return "🙂";
  if (count >= 1) return "😐";
  return "😴";
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

    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await api.listJobs();
        if (!cancelled) {
          setJobs(data);
          setActivity(getActivityLog());
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setActivity(getActivityLog());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const intervalId = setInterval(() => setActivity(getActivityLog()), 2500);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const sevenDayFloor = sevenDaysAgo.toISOString().slice(0, 10);

    const byType = activity.reduce((acc, entry) => {
      acc[entry.type] = (acc[entry.type] || 0) + 1;
      return acc;
    }, {});

    const last7Days = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - idx));
      const key = d.toISOString().slice(0, 10);
      const count = activity.filter((entry) => dayKey(entry.at) === key).length;
      return {
        key,
        label: shortDayLabel(key),
        count,
      };
    });

    const maxDailyCount = Math.max(1, ...last7Days.map((day) => day.count));

    const activeDays = new Set(activity.map((entry) => dayKey(entry.at)));
    const last7 = activity.filter((entry) => dayKey(entry.at) >= sevenDayFloor);
    const todayCount = activity.filter((entry) => dayKey(entry.at) === today).length;

    const applied = byType.job_applied || 0;
    const resumeRuns = byType.resume_analyze || 0;
    const chatSent = byType.chat_message_sent || 0;
    const statusUpdates = byType.status_update || 0;

    const rawScore =
      applied * 12 +
      resumeRuns * 15 +
      chatSent * 4 +
      statusUpdates * 3 +
      activeDays.size * 8;

    const dedicationScore = Math.min(100, Math.round(rawScore));

    const label =
      dedicationScore >= 80
        ? "Very Dedicated"
        : dedicationScore >= 55
        ? "Consistent"
        : dedicationScore >= 30
        ? "Building Momentum"
        : "Needs Consistency";

    const statusCounts = jobs.reduce(
      (acc, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      },
      { applied: 0, interview: 0, rejected: 0, offer: 0 }
    );

    const actionBreakdown = [
      { name: "Applications", value: applied, color: "#cc5a2d" },
      { name: "Resume Analyze", value: resumeRuns, color: "#1f7a6f" },
      { name: "Chat Questions", value: chatSent, color: "#2d6dcc" },
      { name: "Status Updates", value: statusUpdates, color: "#8a5ccc" },
    ];

    const totalBreakdown = actionBreakdown.reduce((sum, item) => sum + item.value, 0);
    const donutData =
      totalBreakdown === 0
        ? [{ name: "No Activity Yet", value: 1, color: "#d6cbb8" }]
        : actionBreakdown.filter((item) => item.value > 0);

    const level = getLevelDetails(dedicationScore);

    const achievements = [
      {
        id: "first-application",
        title: "First Application",
        description: "Applied to at least 1 job",
        unlocked: applied >= 1,
      },
      {
        id: "resume-grinder",
        title: "Resume Grinder",
        description: "Completed 3 resume analyses",
        unlocked: resumeRuns >= 3,
      },
      {
        id: "focused-week",
        title: "Focused Week",
        description: "Maintained a 3-day streak",
        unlocked: calcStreak(activeDays) >= 3,
      },
      {
        id: "high-volume",
        title: "High Volume",
        description: "Logged 25 total actions",
        unlocked: activity.length >= 25,
      },
      {
        id: "interview-ready",
        title: "Interview Ready",
        description: "Reached interview stage",
        unlocked: statusCounts.interview >= 1,
      },
      {
        id: "offer-closer",
        title: "Offer Closer",
        description: "Received an offer",
        unlocked: statusCounts.offer >= 1,
      },
    ];

    const unlockedCount = achievements.filter((a) => a.unlocked).length;

    const appreciationMessage =
      dedicationScore >= 80
        ? "Elite consistency. Your disciplined effort is compounding into real opportunities."
        : dedicationScore >= 55
        ? "Excellent rhythm. Keep this pace and interviews should follow."
        : dedicationScore >= 30
        ? "Great momentum. You are building a reliable career growth routine."
        : "Every step counts. A few focused actions each day will quickly raise your score.";

    const dailyQuestTarget = 3;
    const weeklyQuestTarget = 15;
    const dailyQuestProgress = Math.min(100, Math.round((todayCount / dailyQuestTarget) * 100));
    const weeklyQuestProgress = Math.min(100, Math.round((last7.length / weeklyQuestTarget) * 100));

    return {
      dedicationScore,
      label,
      totalActions: activity.length,
      todayCount,
      last7Count: last7.length,
      streak: calcStreak(activeDays),
      applied,
      resumeRuns,
      chatSent,
      statusUpdates,
      statusCounts,
      last7Days,
      maxDailyCount,
      byType,
      actionBreakdown,
      totalBreakdown,
      donutData,
      level,
      achievements,
      unlockedCount,
      appreciationMessage,
      dailyQuestTarget,
      weeklyQuestTarget,
      dailyQuestProgress,
      weeklyQuestProgress,
    };
  }, [activity, jobs]);

  useEffect(() => {
    if (loading || !stats.achievements?.length) return;

    const seen = getSeenBadges();
    const unlockedBadges = stats.achievements.filter((badge) => badge.unlocked);
    const newlyUnlocked = unlockedBadges.filter((badge) => !seen.includes(badge.id));

    if (newlyUnlocked.length > 0) {
      setToastQueue((prev) => [...prev, ...newlyUnlocked]);
      setSeenBadges([...new Set([...seen, ...unlockedBadges.map((badge) => badge.id)])]);
    }
  }, [loading, stats.achievements]);

  useEffect(() => {
    if (activeToast || toastQueue.length === 0) return;
    const [next, ...rest] = toastQueue;
    setActiveToast(next);
    setToastQueue(rest);
  }, [activeToast, toastQueue]);

  useEffect(() => {
    if (!activeToast) return;
    const timeoutId = setTimeout(() => setActiveToast(null), 3200);
    return () => clearTimeout(timeoutId);
  }, [activeToast]);

  const levelEmoji = getProgressEmoji(stats.level.progress);
  const dailyEmoji = getProgressEmoji(stats.dailyQuestProgress);
  const weeklyEmoji = getProgressEmoji(stats.weeklyQuestProgress);

  return (
    <section className="activity-stack">
      {activeToast && (
        <div className="unlock-toast" role="status" aria-live="polite">
          <strong>🎉 Badge Unlocked</strong>
          <span>{activeToast.title}</span>
        </div>
      )}

      <article className="card">
        <h2>Activity Analyze</h2>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p>Loading activity...</p>
        ) : (
          <div className="activity-grid">
            <div className="activity-stat">
              <p>Dedication Score</p>
              <strong>{stats.dedicationScore}/100</strong>
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
              <span>Total logged actions</span>
            </div>
            <div className="activity-stat">
              <p>Last 7 Days</p>
              <strong>{stats.last7Count}</strong>
              <span>Recent consistency</span>
            </div>
          </div>
        )}
      </article>

      <article className="card appreciation-card">
        <h2>Recognition Hub</h2>
        <p className="appreciation-message">{stats.appreciationMessage}</p>

        <div className="level-row">
          <div className="level-chip">
            <span>Current Level</span>
            <strong>{stats.level.name}</strong>
          </div>
          <div className="level-progress">
            <div className="progress-topline">
              <span>Level Progress</span>
              <span>
                {stats.level.progress}% {getScoreEmoji(stats.dedicationScore)}
              </span>
            </div>
            <div
              className={`progress-track with-emoji ${getProgressMood(stats.level.progress)}`}
              style={{ "--progress": `${Math.max(3, stats.level.progress)}%` }}
            >
              <div className="progress-fill" style={{ width: `${stats.level.progress}%` }} />
              <span key={`level-${levelEmoji}`} className="progress-emoji bounce-in" aria-hidden="true">
                {levelEmoji}
              </span>
            </div>
            <small>
              {stats.level.isMax
                ? "Maximum level reached"
                : `Reach ${stats.level.target}/100 dedication score for the next level`}
            </small>
          </div>
        </div>

        <div className="quest-grid">
          <div className="quest-card">
            <p>Daily Quest</p>
            <strong>
              {stats.todayCount}/{stats.dailyQuestTarget} actions
            </strong>
            <div
              className={`progress-track thin with-emoji ${getProgressMood(stats.dailyQuestProgress)}`}
              style={{ "--progress": `${Math.max(3, stats.dailyQuestProgress)}%` }}
            >
              <div className="progress-fill" style={{ width: `${stats.dailyQuestProgress}%` }} />
              <span key={`daily-${dailyEmoji}`} className="progress-emoji bounce-in" aria-hidden="true">
                {dailyEmoji}
              </span>
            </div>
          </div>
          <div className="quest-card">
            <p>Weekly Quest</p>
            <strong>
              {stats.last7Count}/{stats.weeklyQuestTarget} actions
            </strong>
            <div
              className={`progress-track thin with-emoji ${getProgressMood(stats.weeklyQuestProgress)}`}
              style={{ "--progress": `${Math.max(3, stats.weeklyQuestProgress)}%` }}
            >
              <div className="progress-fill" style={{ width: `${stats.weeklyQuestProgress}%` }} />
              <span key={`weekly-${weeklyEmoji}`} className="progress-emoji bounce-in" aria-hidden="true">
                {weeklyEmoji}
              </span>
            </div>
          </div>
        </div>

        <h3 className="badge-title">Achievements ({stats.unlockedCount}/{stats.achievements.length})</h3>
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
                  <Tooltip
                    formatter={(value) => [`${value} actions`, "Momentum"]}
                    labelFormatter={(label, payload) => {
                      const day = payload?.[0]?.payload;
                      return `${label} ${getDailyEmoji(day?.count || 0)}`;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Actions"
                    stroke="#1f7a6f"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#momentumFill)"
                    dot={(props) => {
                      const { cx, cy, payload } = props;
                      if (typeof cx !== "number" || typeof cy !== "number") return null;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={4} fill="#1f7a6f" />
                          <text x={cx} y={cy - 10} textAnchor="middle" fontSize="11">
                            {getDailyEmoji(payload.count)}
                          </text>
                        </g>
                      );
                    }}
                    activeDot={{ r: 6, fill: "#165f56" }}
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
              {stats.totalBreakdown === 0 && (
                <p className="chart-empty-note">Add activity to reveal your action split donut chart.</p>
              )}
            </div>
          </div>
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
                    <td>{entry.type.replaceAll("_", " ")}</td>
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
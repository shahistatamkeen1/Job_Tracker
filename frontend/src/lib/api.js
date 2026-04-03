const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Request failed");
  }

  return res.json();
}

export const api = {
  listJobs: () => request("/jobs"),

  createJob: (payload) =>
    request("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateJob: (jobId, payload) =>
    request(`/jobs/${jobId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  updateStatus: (jobId, payload) =>
    request(`/jobs/${jobId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteJob: (jobId) =>
    request(`/jobs/${jobId}`, {
      method: "DELETE",
    }),

  generateJobInsight: (jobId) =>
    request(`/jobs/${jobId}/generate-insight`, {
      method: "POST",
    }),

  chatAboutJD: (payload) =>
    request("/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  atsResume: (payload) =>
    request("/ai/ats-resume", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getGmailAuthUrl: () => request("/auth/gmail/login"),

  syncGmail: (accessToken) =>
    request("/jobs/sync/gmail", {
      method: "POST",
      body: JSON.stringify({
        access_token: accessToken,
        token_type: "Bearer",
      }),
    }),

  listDebugChallenges: () => request("/debug-lab/challenges"),

  getDebugChallenge: (challengeId) =>
    request(`/debug-lab/challenges/${challengeId}`),

  runDebugChallenge: (payload) =>
    request("/debug-lab/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getDebugHint: (payload) =>
    request("/debug-lab/hint", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  resetDebugChallenge: (challengeId) =>
    request(`/debug-lab/reset/${challengeId}`),
};
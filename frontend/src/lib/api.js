const API_BASE_URL = "http://127.0.0.1:8000";

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  console.log("API REQUEST:", url);

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("API ERROR:", errorText);
    throw new Error(errorText || "Request failed");
  }

  return res.json();
}

export const api = {
  // =========================
  // 🤖 AI Chat (Career Copilot)
  // =========================
  chatAboutJD(payload) {
    return request("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // =========================
  // 📊 JOB APPLICATIONS
  // =========================
  listJobs() {
    return request("/api/jobs");
  },

  createJob(payload) {
    return request("/api/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateJob(jobId, payload) {
    return request(`/api/jobs/${jobId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteJob(jobId) {
    return request(`/api/jobs/${jobId}`, {
      method: "DELETE",
    });
  },

  // =========================
  // 🧠 AI INSIGHTS
  // =========================
  generateJobInsight(jobId) {
    return request(`/api/jobs/${jobId}/generate-insight`, {
      method: "POST",
    });
  },

  // =========================
  // ✉️ NEW FEATURE: FOLLOW-UP EMAIL
  // =========================
  generateFollowUp(jobId) {
    return request(`/api/jobs/${jobId}/follow-up`, {
      method: "POST",
    });
  },

  // =========================
  // 📧 GMAIL INTEGRATION
  // =========================
  getGmailAuthUrl() {
    return request("/api/gmail/auth-url");
  },

  syncGmailApplications() {
    return request("/api/gmail/sync", {
      method: "POST",
    });
  },

  // =========================
  // 📄 ATS RESUME
  // =========================
  getATSScore(payload) {
    return request("/api/ai/ats", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // =========================
  // 🧪 DEBUG LAB
  // =========================
  generateDebugChallenge(payload) {
    return request("/api/debug-lab/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
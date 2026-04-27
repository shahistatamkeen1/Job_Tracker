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
    throw new Error(errorText || "Request failed");
  }

  return res.json();
}

export const api = {
  chatAboutJD(payload) {
    return request("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listJobs() {
    return request("/api/jobs");
  },

  createJob(payload) {
    return request("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateJob(jobId, payload) {
    return request(`/jobs/${jobId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  deleteJob(jobId) {
    return request(`/jobs/${jobId}`, {
      method: "DELETE",
    });
  },
};
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { logActivity } from "../lib/activity";
import GmailSync from "./GmailSync";

const statuses = ["applied", "interview", "rejected", "offer"];

export default function JobTracker({ onPracticeDebug }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [generatingInsight, setGeneratingInsight] = useState(null);
  const [generatingFollowUp, setGeneratingFollowUp] = useState(null);

  const [insightModal, setInsightModal] = useState(null);
  const [followUpModal, setFollowUpModal] = useState(null);

  const [form, setForm] = useState({
    company: "",
    role: "",
    job_description: "",
    status: "applied",
    applied_on: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  async function loadJobs() {
    try {
      setLoading(true);
      setError("");
      const data = await api.listJobs();
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  const counts = useMemo(() => {
    return statuses.reduce((acc, status) => {
      acc[status] = jobs.filter((job) => job.status === status).length;
      return acc;
    }, {});
  }, [jobs]);

  async function submitJob(event) {
    event.preventDefault();

    try {
      setError("");
      await api.createJob(form);

      logActivity("job_applied", {
        company: form.company,
        role: form.role,
      });

      setForm({
        company: "",
        role: "",
        job_description: "",
        status: "applied",
        applied_on: new Date().toISOString().slice(0, 10),
        notes: "",
      });

      await loadJobs();
    } catch (e) {
      setError(e.message || "Failed to save application.");
    }
  }

  async function onStatusChange(jobId, status) {
    try {
      setError("");
      await api.updateJob(jobId, { status });

      logActivity("status_update", { status });

      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, status } : job))
      );
    } catch (e) {
      setError(e.message || "Failed to update status.");
    }
  }

  async function onDelete(jobId) {
    try {
      setError("");
      await api.deleteJob(jobId);
      logActivity("job_deleted");
      await loadJobs();
    } catch (e) {
      setError(e.message || "Failed to delete application.");
    }
  }

  async function generateAIInsight(job) {
    try {
      setError("");
      setGeneratingInsight(job.id);

      const response = await api.generateJobInsight(job.id);
      const insight = response.insight || "No insight generated.";

      setInsightModal({
        company: job.company,
        role: job.role,
        insight,
      });
    } catch (e) {
      setError(e.message || "Failed to generate AI insight.");
    } finally {
      setGeneratingInsight(null);
    }
  }

  async function generateFollowUp(job) {
    try {
      setError("");
      setGeneratingFollowUp(job.id);

      const response = await api.generateFollowUp(job.id);
      const email = response.email || response.follow_up_email || "";

      setFollowUpModal({
        company: job.company,
        role: job.role,
        email,
      });
    } catch (e) {
      setError(e.message || "Failed to generate follow-up email.");
    } finally {
      setGeneratingFollowUp(null);
    }
  }

  async function copyFollowUp() {
    if (!followUpModal?.email) return;
    await navigator.clipboard.writeText(followUpModal.email);
  }

  async function copyInsight() {
    if (!insightModal?.insight) return;
    await navigator.clipboard.writeText(insightModal.insight);
  }

  async function handleGmailSync() {
    await loadJobs();
  }

  function practiceDebug(job) {
    if (onPracticeDebug) {
      onPracticeDebug(job);
    }
  }

  return (
    <section className="stack-grid">
      <div className="form-import-row">
        <article className="card">
          <div className="section-topline tracker-headline">
            <div>
              <span className="section-kicker">Application desk</span>
              <h2>Add Application</h2>
            </div>
          </div>

          <form onSubmit={submitJob} className="form-grid">
            <input
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              required
            />

            <input
              placeholder="Role"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              required
            />

            <input
              type="date"
              value={form.applied_on}
              onChange={(e) => setForm({ ...form, applied_on: e.target.value })}
              required
            />

            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <textarea
              rows={5}
              placeholder="Paste job description"
              value={form.job_description}
              onChange={(e) =>
                setForm({ ...form, job_description: e.target.value })
              }
              required
            />

            <textarea
              rows={3}
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />

            <button type="submit">Save Application</button>
          </form>
        </article>

        <article className="card">
          <div className="section-topline tracker-headline">
            <div>
              <span className="section-kicker">Email import</span>
              <h2>Import from Gmail</h2>
            </div>
          </div>

          <GmailSync onSync={handleGmailSync} />
        </article>
      </div>

      <article className="card pipeline-card">
        <div className="section-topline tracker-headline">
          <div>
            <span className="section-kicker">Pipeline overview</span>
            <h2>Track your applications</h2>
          </div>
        </div>

        <div className="pill-row">
          {statuses.map((status) => (
            <span key={status} className={`pill ${status}`}>
              {status}: {counts[status] || 0}
            </span>
          ))}
        </div>

        {error && <p className="error">{error}</p>}

        {loading ? (
          <p>Loading applications...</p>
        ) : (
          <div className="table-wrap job-table-wrap">
            <table className="job-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>AI Insight</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="5">No applications yet.</td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id}>
                      <td data-label="Company">{job.company}</td>

                      <td data-label="Role">{job.role}</td>

                      <td data-label="Status">
                        <select
                          value={job.status}
                          onChange={(e) =>
                            onStatusChange(job.id, e.target.value)
                          }
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td data-label="AI Insight">
                        <button
                          type="button"
                          className="ai-btn"
                          onClick={() => generateAIInsight(job)}
                          disabled={generatingInsight === job.id}
                        >
                          {generatingInsight === job.id
                            ? "Generating..."
                            : "Generate"}
                        </button>
                      </td>

                      <td data-label="Actions">
                        <div className="job-action-stack">
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => practiceDebug(job)}
                          >
                            Practice
                          </button>

                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => generateFollowUp(job)}
                            disabled={generatingFollowUp === job.id}
                          >
                            {generatingFollowUp === job.id
                              ? "Writing..."
                              : "Follow-up"}
                          </button>

                          <button
                            type="button"
                            className="danger"
                            onClick={() => onDelete(job.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </article>

      {insightModal && (
        <div
          className="insight-modal-backdrop"
          onClick={() => setInsightModal(null)}
        >
          <div className="followup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="section-topline">
              <div>
                <span className="section-kicker">AI Insight</span>
                <h3>
                  {insightModal.company} - {insightModal.role}
                </h3>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setInsightModal(null)}
              >
                ×
              </button>
            </div>

            <pre className="followup-email-box">{insightModal.insight}</pre>

            <div className="followup-actions">
              <button type="button" onClick={copyInsight}>
                Copy Insight
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setInsightModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {followUpModal && (
        <div
          className="followup-modal-backdrop"
          onClick={() => setFollowUpModal(null)}
        >
          <div className="followup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="section-topline">
              <div>
                <span className="section-kicker">AI Follow-up Email</span>
                <h3>
                  {followUpModal.company} - {followUpModal.role}
                </h3>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setFollowUpModal(null)}
              >
                ×
              </button>
            </div>

            <pre className="followup-email-box">{followUpModal.email}</pre>

            <div className="followup-actions">
              <button type="button" onClick={copyFollowUp}>
                Copy Email
              </button>

              <button
                type="button"
                className="secondary-btn"
                onClick={() => setFollowUpModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
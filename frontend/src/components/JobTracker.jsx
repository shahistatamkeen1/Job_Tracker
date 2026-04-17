import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { logActivity } from "../lib/activity";
import GmailSync from "./GmailSync";

const statuses = ["applied", "interview", "rejected", "offer"];

export default function JobTracker() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingInsight, setGeneratingInsight] = useState(null);
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
      setJobs(data);
    } catch (e) {
      setError(e.message);
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
      await api.createJob(form);
      logActivity("job_applied", { company: form.company, role: form.role });
      setForm({
        company: "",
        role: "",
        job_description: "",
        status: "applied",
        applied_on: new Date().toISOString().slice(0, 10),
        notes: "",
      });
      loadJobs();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onStatusChange(jobId, status) {
    const note = status === "rejected" ? "Status moved to rejected by user" : "Status updated";
    try {
      await api.updateStatus(jobId, { status, note });
      logActivity("status_update", { status });
      loadJobs();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onDelete(jobId) {
    try {
      await api.deleteJob(jobId);
      logActivity("job_deleted");
      loadJobs();
    } catch (e) {
      setError(e.message);
    }
  }

  async function generateAIInsight(jobId) {
    try {
      setGeneratingInsight(jobId);
      const response = await api.generateJobInsight(jobId);
      setJobs((prev) => prev.map((job) => (job.id === jobId ? { ...job, ai_rejection_reason: response.insight } : job)));
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingInsight(null);
    }
  }

  function handleGmailSync(syncedJobs) {
    // Add the newly synced jobs to the current jobs list
    if (syncedJobs && syncedJobs.length > 0) {
      setJobs((prev) => [...prev, ...syncedJobs]);
    } else {
      // If no jobs were passed, reload all jobs from the server
      loadJobs();
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
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
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
              onChange={(e) => setForm({ ...form, job_description: e.target.value })}
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
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>AI Rejection Insight</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{job.company}</td>
                    <td>{job.role}</td>
                    <td>
                      <select value={job.status} onChange={(e) => onStatusChange(job.id, e.target.value)}>
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {job.ai_rejection_reason ? (
                        <span>{job.ai_rejection_reason}</span>
                      ) : (
                        <button
                          type="button"
                          className="ai-btn"
                          onClick={() => generateAIInsight(job.id)}
                          disabled={generatingInsight === job.id}
                        >
                          {generatingInsight === job.id ? "Generating..." : "Generate Insight"}
                        </button>
                      )}
                    </td>
                    <td>
                      <button type="button" className="danger" onClick={() => onDelete(job.id)}>
                        Delete
                      </button>
                    </td>
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
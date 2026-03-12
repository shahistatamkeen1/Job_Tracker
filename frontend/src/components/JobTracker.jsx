import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { logActivity } from "../lib/activity";

const statuses = ["applied", "interview", "rejected", "offer"];

export default function JobTracker() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
    return statuses.reduce((acc, s) => {
      acc[s] = jobs.filter((j) => j.status === s).length;
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

  return (
    <section className="stack-grid">
      <article className="card">
        <h2>Add Application</h2>
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
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <textarea
            rows={5}
            placeholder="Paste Job Description"
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
        <h2>Pipeline Overview</h2>
        <div className="pill-row">
          {statuses.map((s) => (
            <span key={s} className={`pill ${s}`}>
              {s}: {counts[s] || 0}
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
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{job.ai_rejection_reason || "No analysis yet"}</td>
                    <td>
                      <button className="danger" onClick={() => onDelete(job.id)}>
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

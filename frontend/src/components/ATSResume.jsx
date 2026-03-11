import { useState } from "react";
import { api } from "../lib/api";

export default function ATSResume() {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function analyze(event) {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const data = await api.atsResume({
        job_description: jobDescription,
        resume_text: resumeText,
      });
      setResult(data);
    } catch (e) {
      setResult({ score: 0, gaps: [e.message], improved_resume: "" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="stack-grid">
      <article className="card">
        <h2>ATS Resume Builder</h2>
        <form className="form-grid" onSubmit={analyze}>
          <textarea
            rows={8}
            placeholder="Paste Job Description"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            required
          />
          <textarea
            rows={10}
            placeholder="Paste your current resume text"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? "Analyzing..." : "Analyze and Improve"}
          </button>
        </form>
      </article>

      <article className="card">
        <h2>Result</h2>
        {!result && <p>Submit JD + resume to get ATS score and improved version.</p>}
        {result && (
          <div>
            <p className="score">ATS Score: {result.score}/100</p>
            <h3>Improvement Areas</h3>
            <ul>
              {(result.gaps || []).map((gap, i) => (
                <li key={i}>{gap}</li>
              ))}
            </ul>
            <h3>AI Improved Resume Draft</h3>
            <textarea rows={12} value={result.improved_resume || ""} readOnly />
          </div>
        )}
      </article>
    </section>
  );
}

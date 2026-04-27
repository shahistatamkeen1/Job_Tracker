import { useEffect, useMemo, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { api } from "../lib/api";
import { logActivity } from "../lib/activity";
import { buildResumeText, getProfile } from "../lib/profile";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

async function extractPdfText(file) {
  const bytes = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: bytes });
  const pdf = await loadingTask.promise;

  const pages = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    if (text) pages.push(text);
  }

  return pages.join("\n");
}

function getKeywords(text = "") {
  const stopWords = new Set([
    "the", "and", "with", "for", "you", "your", "are", "will", "this", "that",
    "from", "have", "our", "can", "job", "role", "team", "work", "using",
  ]);

  return [...new Set(
    text
      .toLowerCase()
      .match(/[a-zA-Z][a-zA-Z0-9+#.]{2,}/g) || []
  )]
    .filter((word) => !stopWords.has(word))
    .slice(0, 18);
}

export default function ATSResume({ userEmail }) {
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [resumePreviewUrl, setResumePreviewUrl] = useState("");
  const [resumePreviewText, setResumePreviewText] = useState("");
  const [resumeSource, setResumeSource] = useState("none");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [helperText, setHelperText] = useState("");

  useEffect(() => {
    return () => {
      if (resumePreviewUrl) URL.revokeObjectURL(resumePreviewUrl);
    };
  }, [resumePreviewUrl]);

  const previewMode = useMemo(() => {
    if (resumeSource === "profile") return "text";
    if (!resumeFile) return "none";
    if (resumeFile.type === "application/pdf") return "pdf";
    if (resumeFile.type.startsWith("image/")) return "image";
    return "text";
  }, [resumeFile, resumeSource]);

  const scoreView = useMemo(() => {
    if (!result) {
      return {
        original: 0,
        improved: 0,
        increase: 0,
        pct: 0,
        level: "Starter",
        icon: "🙂",
      };
    }

    const original = result.original_score ?? result.score ?? 0;
    const improved = result.improved_score ?? result.score ?? 0;
    const increase = result.score_increase ?? improved - original;
    const pct = Math.max(0, Math.min(100, improved));

    let level = "Starter";
    let icon = "🙂";

    if (improved >= 90) {
      level = "ATS Champion";
      icon = "🏆";
    } else if (improved >= 80) {
      level = "Strong Match";
      icon = "🚀";
    } else if (improved >= 65) {
      level = "Good Momentum";
      icon = "💪";
    }

    return { original, improved, increase, pct, level, icon };
  }, [result]);

  const keywordView = useMemo(() => {
    const jdKeywords = getKeywords(jobDescription);
    const improvedResume = result?.improved_resume || "";
    const resumeLower = improvedResume.toLowerCase();

    return jdKeywords.map((keyword) => ({
      keyword,
      matched: resumeLower.includes(keyword.toLowerCase()),
    }));
  }, [jobDescription, result]);

  function useProfileResume() {
    const profile = getProfile(userEmail);
    const generated = buildResumeText(profile);

    if (!generated.trim()) {
      setHelperText("Profile is empty. Add profile details first.");
      return;
    }

    setResumeText(generated);
    setResumeFile(null);

    if (resumePreviewUrl) {
      URL.revokeObjectURL(resumePreviewUrl);
      setResumePreviewUrl("");
    }

    setResumePreviewText(generated);
    setResumeSource("profile");
    setHelperText("Loaded resume draft from your profile.");
  }

  async function onResumeFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setResumeFile(file);
    setResumeSource("upload");
    setResult(null);
    setHelperText("");

    if (resumePreviewUrl) URL.revokeObjectURL(resumePreviewUrl);

    const nextPreviewUrl = URL.createObjectURL(file);
    setResumePreviewUrl(nextPreviewUrl);

    const isLikelyText =
      file.type.startsWith("text/") || /\.(txt|md|rtf|json)$/i.test(file.name || "");

    if (isLikelyText) {
      const text = await file.text();
      setResumeText(text);
      setResumePreviewText(text);
      setHelperText("Resume uploaded and text extracted for ATS analysis.");
      return;
    }

    if (file.type === "application/pdf") {
      try {
        const extracted = await extractPdfText(file);

        if (!extracted.trim()) {
          setResumeText("");
          setResumePreviewText("");
          setHelperText(
            "PDF preview ready, but no selectable text was found. Use Profile Data or upload a text-based resume."
          );
          return;
        }

        setResumeText(extracted);
        setResumePreviewText(extracted);
        setHelperText("PDF uploaded, preview ready, and text extracted for ATS analysis.");
      } catch {
        setResumeText("");
        setResumePreviewText("");
        setHelperText("PDF preview is available, but text extraction failed.");
      }

      return;
    }

    setResumeText("");
    setResumePreviewText("");
    setHelperText("Preview is available, but ATS text extraction is not supported for this file.");
  }

  async function analyze(event) {
    event.preventDefault();

    if (!resumeText.trim()) {
      setResult({
        score: 0,
        original_score: 0,
        improved_score: 0,
        score_increase: 0,
        gaps: ["No resume text available. Upload a resume or use Profile Data first."],
        improved_resume: "",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = await api.atsResume({
        job_description: jobDescription,
        resume_text: resumeText,
      });

      setResult(data);
      logActivity("resume_analyze", { score: data.score || 0 });
    } catch (e) {
      setResult({
        score: 0,
        original_score: 0,
        improved_score: 0,
        score_increase: 0,
        gaps: [e.message],
        improved_resume: "",
      });
    } finally {
      setLoading(false);
    }
  }

  function copyImprovedResume() {
    if (!result?.improved_resume) return;
    navigator.clipboard.writeText(result.improved_resume);
    setHelperText("Improved resume copied to clipboard.");
  }

  function downloadImprovedResume() {
    if (!result?.improved_resume) return;

    const blob = new Blob([result.improved_resume], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ai-improved-resume.txt";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <section className="ats-premium-page">
      <div className="ats-top-grid">
        <article className="card ats-builder-card">
          <span className="section-kicker">ATS Resume Studio</span>
          <h2>Improve Your Resume Match</h2>
          <p className="ats-muted">
            Upload your resume, paste a job description, and let AI improve your ATS score.
          </p>

          <form className="form-grid" onSubmit={analyze}>
            <button type="button" className="secondary-btn" onClick={useProfileResume}>
              Use Profile Data
            </button>

            <input
              type="file"
              accept=".txt,.md,.rtf,.pdf,.doc,.docx,image/*"
              onChange={onResumeFileChange}
            />

            {helperText && <p className="ats-helper">{helperText}</p>}

            <textarea
              rows={11}
              placeholder="Paste Job Description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Analyzing..." : "Analyze and Improve"}
            </button>
          </form>
        </article>

        <article className="card resume-preview ats-preview-card">
          <span className="section-kicker">Resume Preview</span>
          <h2>Uploaded Resume</h2>

          {previewMode === "none" && (
            <div className="ats-empty-preview">
              <h3>No resume uploaded yet</h3>
              <p>Upload a resume or use your profile data.</p>
            </div>
          )}

          {previewMode === "pdf" && resumePreviewUrl && (
            <iframe
              title="Resume PDF Preview"
              src={`${resumePreviewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="resume-preview-frame"
            />
          )}

          {previewMode === "image" && resumePreviewUrl && (
            <img
              src={resumePreviewUrl}
              alt="Uploaded resume preview"
              className="resume-preview-image"
            />
          )}

          {previewMode === "text" && (
            <textarea
              rows={14}
              value={resumePreviewText || "No text preview available for this file."}
              readOnly
            />
          )}
        </article>
      </div>

      <article className="card ats-premium-result-card">
        <div className="ats-result-header">
          <div>
            <span className="section-kicker">ATS Result</span>
            <h2>Resume Match Dashboard</h2>
            <p className="ats-muted">
              Track your original score, AI-improved score, and key improvements.
            </p>
          </div>

          <span className="ats-level-badge premium">
            {scoreView.icon} {scoreView.level}
          </span>
        </div>

        <div className="ats-score-hero">
          <div className="ats-big-score before">
            <span>Before</span>
            <strong>{scoreView.original}%</strong>
            <p>Uploaded Resume</p>
          </div>

          <div className="ats-score-arrow">
            <span>→</span>
            <small>AI Rewrite</small>
          </div>

          <div className="ats-big-score after">
            <span>After</span>
            <strong>{scoreView.improved}%</strong>
            <p>Improved Resume</p>
          </div>

          <div className="ats-big-score gain">
            <span>Increase</span>
            <strong>
              {scoreView.increase >= 0 ? "+" : ""}
              {scoreView.increase}
            </strong>
            <p>Score Boost</p>
          </div>
        </div>

        <div className="ats-progress-wrap premium">
          <div className="ats-progress-topline">
            <span>ATS Strength</span>
            <span>{scoreView.pct}%</span>
          </div>

          <div className="ats-progress-track premium-track">
            <div
              className="ats-progress-fill premium-fill"
              style={{ width: `${scoreView.pct}%` }}
            />
          </div>
        </div>

        {!result && (
          <div className="ats-empty-result">
            <h3>Run Analyze and Improve</h3>
            <p>Your ATS score, keyword match, and improved resume will appear here.</p>
          </div>
        )}

        {result && (
          <>
            <div className="ats-insight-grid">
              <section className="ats-premium-panel">
                <h3>Improvement Areas</h3>
                <div className="ats-gap-grid">
                  {(result.gaps || []).map((gap, index) => (
                    <div className="ats-gap-card" key={index}>
                      <span>{index + 1}</span>
                      <p>{gap}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="ats-premium-panel">
                <h3>Keyword Match</h3>
                <div className="ats-keyword-cloud">
                  {keywordView.length === 0 ? (
                    <p>No keywords detected yet.</p>
                  ) : (
                    keywordView.map((item) => (
                      <span
                        key={item.keyword}
                        className={item.matched ? "matched" : "missing"}
                      >
                        {item.matched ? "✓" : "○"} {item.keyword}
                      </span>
                    ))
                  )}
                </div>
              </section>
            </div>

            <section className="ats-premium-panel resume-document-panel">
              <div className="ats-document-header">
                <div>
                  <h3>AI Improved Resume Draft</h3>
                  <p>ATS-friendly version rewritten for the job description.</p>
                </div>

                <div className="ats-document-actions">
                  <button type="button" className="secondary-btn" onClick={copyImprovedResume}>
                    Copy
                  </button>
                  <button type="button" onClick={downloadImprovedResume}>
                    Download
                  </button>
                </div>
              </div>

              <div className="resume-output-paper premium-paper">
                <pre>{result.improved_resume || ""}</pre>
              </div>
            </section>
          </>
        )}
      </article>
    </section>
  );
}
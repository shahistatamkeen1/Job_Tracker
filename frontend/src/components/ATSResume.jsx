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
    if (improved >= 85) {
      level = "ATS Pro";
      icon = "🏆";
    } else if (improved >= 70) {
      level = "Strong Match";
      icon = "🚀";
    } else if (improved >= 55) {
      level = "Good Momentum";
      icon = "💪";
    }

    return { original, improved, increase, pct, level, icon };
  }, [result]);

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
            "PDF preview ready, but no selectable text was found (likely scanned PDF). Use Profile Data or upload a text-based resume."
          );
          return;
        }

        setResumeText(extracted);
        setResumePreviewText(extracted);
        setHelperText("PDF uploaded, preview ready, and text extracted for ATS analysis.");
      } catch {
        setResumeText("");
        setResumePreviewText("");
        setHelperText(
          "PDF preview is available, but text extraction failed for this file. Use Profile Data or a text-based resume."
        );
      }
      return;
    }

    setResumeText("");
    setResumePreviewText("");
    setHelperText("Preview is available for this file type, but ATS text extraction is not supported yet.");
  }

  async function analyze(event) {
    event.preventDefault();
    if (!resumeText.trim()) {
      setResult({
        score: 0,
        gaps: ["No resume text available for ATS. Upload a text resume or use Profile Data first."],
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
      setResult({ score: 0, gaps: [e.message], improved_resume: "" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ats-layout">
      <div className="ats-top-grid">
        <article className="card">
          <h2>ATS Resume Builder</h2>
          <form className="form-grid" onSubmit={analyze}>
            <button type="button" className="secondary-btn" onClick={useProfileResume}>
              Use Profile Data
            </button>
            <input
              type="file"
              accept=".txt,.md,.rtf,.pdf,.doc,.docx,image/*"
              onChange={onResumeFileChange}
            />
            {helperText && <p>{helperText}</p>}
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

        <article className="card resume-preview">
          <h2>Resume Preview</h2>
          {previewMode === "none" && <p>Upload a resume file to preview it here.</p>}

          {previewMode === "pdf" && resumePreviewUrl && (
            <iframe
              title="Resume PDF Preview"
              src={`${resumePreviewUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="resume-preview-frame"
            />
          )}

          {previewMode === "image" && resumePreviewUrl && (
            <img src={resumePreviewUrl} alt="Uploaded resume preview" className="resume-preview-image" />
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

      <article className="card">
        <h2>Result</h2>
        <div className="ats-game-panel">
          <div className="ats-game-headline">
            <h3>ATS Challenge Board</h3>
            <span className="ats-level-badge">
              {scoreView.icon} {scoreView.level}
            </span>
          </div>

          <div className="ats-score-grid">
            <div className="ats-score-card">
              <p>Uploaded Resume Score</p>
              <strong>{scoreView.original}/100</strong>
            </div>
            <div className="ats-score-card">
              <p>Rewritten Resume Score</p>
              <strong>{scoreView.improved}/100</strong>
            </div>
            <div className="ats-score-card">
              <p>Score Increase</p>
              <strong className={scoreView.increase >= 0 ? "score-up" : "score-down"}>
                {scoreView.increase >= 0 ? "+" : ""}
                {scoreView.increase}
              </strong>
            </div>
          </div>

          <div className="ats-progress-wrap">
            <div className="ats-progress-topline">
              <span>Rewritten Strength</span>
              <span>{scoreView.pct}%</span>
            </div>
            <div className="ats-progress-track">
              <div className="ats-progress-fill" style={{ width: `${scoreView.pct}%` }} />
            </div>
          </div>
        </div>

        {!result && <p>Run Analyze and Improve to see ATS insights and rewritten resume.</p>}
        {result && (
          <>
            <h3>Improvement Areas</h3>
            <ul>
              {(result.gaps || []).map((gap, i) => (
                <li key={i}>{gap}</li>
              ))}
            </ul>
            <h3>AI Improved Resume Draft</h3>
            <div className="resume-output-paper">
              <pre>{result.improved_resume || ""}</pre>
            </div>
          </>
        )}
      </article>
    </section>
  );
}

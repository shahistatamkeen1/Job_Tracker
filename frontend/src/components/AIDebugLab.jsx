import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";

export default function AIDebugLab({ selectedJob }) {
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [hintIndex, setHintIndex] = useState(0);
  const [hint, setHint] = useState("");
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const passLabel = useMemo(() => {
    if (!result) return "Not run yet";
    return `${result.tests_passed}/${result.total_tests} tests passed`;
  }, [result]);

  async function generateChallenge() {
    if (!selectedJob?.job_description) {
      setError("Select a job first from Applications → Practice");
      return;
    }

    try {
      setLoadingChallenge(true);
      setError("");
      setChallenge(null);
      setCode("");
      setResult(null);
      setHint("");
      setHintIndex(0);

      const data = await api.generateDebugChallenge({
        company: selectedJob.company || "",
        role: selectedJob.role || "",
        job_description: `${selectedJob.job_description}

Generate a NEW challenge now. Timestamp: ${Date.now()}`,
      });

      setChallenge(data);
      setCode(data.starter_code || "");
    } catch (err) {
      setError(err.message || "Failed to generate challenge");
    } finally {
      setLoadingChallenge(false);
    }
  }

  useEffect(() => {
    if (selectedJob?.job_description) {
      generateChallenge();
    }
  }, [selectedJob?.id]);

  async function runTests() {
    if (!challenge) return;

    try {
      setRunning(true);
      setError("");

      const data = await api.runDynamicDebugChallenge({
        challenge,
        code,
      });

      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to run tests.");
    } finally {
      setRunning(false);
    }
  }

  function getHint() {
    if (!challenge?.hints?.length) return;

    const safeIndex = Math.min(hintIndex, challenge.hints.length - 1);
    setHint(challenge.hints[safeIndex]);
    setHintIndex((prev) => prev + 1);
  }

  function resetCode() {
    if (!challenge) return;

    setCode(challenge.starter_code || "");
    setResult(null);
    setHint("");
    setHintIndex(0);
  }

  return (
    <section className="debug-lab-page">
      <aside className="card debug-lab-sidebar">
        <span className="section-kicker">Real-Time Interview Practice</span>
        <h2>AI Debug Lab</h2>

        <p>
          AI creates a custom debugging challenge from the selected job
          description.
        </p>

        <div className="debug-panel-stack">
          {selectedJob ? (
            <div className="debug-summary-box">
              <h3>Practice for this job</h3>
              <p>
                <strong>{selectedJob.role}</strong> at{" "}
                <strong>{selectedJob.company}</strong>
              </p>
              <p>This challenge is generated from this job description in real time.</p>
            </div>
          ) : (
            <div className="debug-summary-box">
              <h3>No job selected</h3>
              <p>Go to Applications and click Practice on any job.</p>
            </div>
          )}

          <button
            type="button"
            onClick={generateChallenge}
            disabled={loadingChallenge || !selectedJob}
          >
            {loadingChallenge ? "Generating..." : "Generate New Challenge"}
          </button>

          {error && <div className="error-message">{error}</div>}

          {challenge && (
            <>
              <div className="pill-row">
                <span className="pill">{challenge.language || "python"}</span>
                <span className="pill">{challenge.difficulty || "easy"}</span>
                <span className="pill">{challenge.topic || "debugging"}</span>
              </div>

              <div className="debug-summary-box">
                <h3>{challenge.title}</h3>
                <p>{challenge.description}</p>

                <p>
                  <strong>Bug Type:</strong> {challenge.bug_type}
                </p>

                <p>
                  <strong>Expected:</strong> {challenge.expected_behavior}
                </p>

                <p>
                  <strong>Why this matches:</strong>{" "}
                  {challenge.why_this_matches_job}
                </p>

                <p>
                  <strong>Hints Available:</strong> {challenge.hints?.length || 0}
                </p>
              </div>

              <div className="debug-action-stack">
                <button onClick={runTests} disabled={running}>
                  {running ? "Running..." : "Run Tests"}
                </button>

                <button className="secondary-btn" onClick={getHint}>
                  Get Hint
                </button>

                <button className="secondary-btn" onClick={resetCode}>
                  Reset Code
                </button>
              </div>

              {hint && (
                <div className="debug-hint-box">
                  <h3>Hint</h3>
                  <p>{hint}</p>
                </div>
              )}
            </>
          )}
        </div>
      </aside>

      <main className="card debug-lab-main">
        <div className="debug-header-row">
          <div>
            <span className="section-kicker">Editor Workspace</span>
            <h2>Code Editor</h2>
            <p className="debug-muted">{passLabel}</p>
          </div>

          {result && <div className="debug-score-chip">Score: {result.score}%</div>}
        </div>

        {loadingChallenge ? (
          <div className="debug-results-box">
            <h3>Generating new challenge...</h3>
            <p>AI is creating a fresh problem based on your job.</p>
          </div>
        ) : challenge ? (
          <textarea
            className="debug-code-editor"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck="false"
          />
        ) : (
          <div className="debug-results-box">
            <h3>Waiting for a job</h3>
            <p>
              Click Practice from a job in your Applications table to create a
              real-time AI challenge.
            </p>
          </div>
        )}

        {result && (
          <div className="debug-results-box">
            <h3>Test Results</h3>
            <p className="debug-feedback">{result.feedback}</p>

            <div className="debug-test-list">
              {result.results.map((test, index) => (
                <div
                  key={index}
                  className={`debug-test-row ${test.passed ? "passed" : "failed"}`}
                >
                  <div className="debug-test-top">
                    <strong>Test {index + 1}</strong>
                    <span>{test.passed ? "Passed" : "Failed"}</span>
                  </div>

                  <p>
                    <strong>Input:</strong> {JSON.stringify(test.input)}
                  </p>
                  <p>
                    <strong>Expected:</strong> {JSON.stringify(test.expected)}
                  </p>
                  <p>
                    <strong>Actual:</strong> {JSON.stringify(test.actual)}
                  </p>

                  {test.error && (
                    <p>
                      <strong>Error:</strong> {test.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </section>
  );
}
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { logActivity } from "../lib/activity";

export default function AIDebugLab() {
  const [challenges, setChallenges] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [hint, setHint] = useState("");
  const [hintIndex, setHintIndex] = useState(0);
  const [linkedJobId, setLinkedJobId] = useState("");
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [loadingRun, setLoadingRun] = useState(false);
  const [loadingHint, setLoadingHint] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadChallenges() {
      try {
        setLoadingChallenges(true);
        setError("");
        const data = await api.listDebugChallenges();
        setChallenges(data);

        if (data.length > 0) {
          setSelectedId(data[0].id);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingChallenges(false);
      }
    }

    loadChallenges();
  }, []);

  useEffect(() => {
    if (!selectedId) return;

    async function loadChallenge() {
      try {
        setLoadingChallenge(true);
        setError("");
        const data = await api.getDebugChallenge(selectedId);
        setChallenge(data);
        setCode(data.starter_code);
        setResult(null);
        setHint("");
        setHintIndex(0);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoadingChallenge(false);
      }
    }

    loadChallenge();
  }, [selectedId]);

  const passLabel = useMemo(() => {
    if (!result) return "Not run yet";
    return `${result.tests_passed}/${result.total_tests} tests passed`;
  }, [result]);

  async function handleRunTests() {
    if (!selectedId || !code.trim()) return;

    try {
      setLoadingRun(true);
      setError("");
      const data = await api.runDebugChallenge({
        challenge_id: selectedId,
        code,
        linked_job_id: linkedJobId ? Number(linkedJobId) : null,
      });
      setResult(data);

      logActivity("debug_lab_run", {
        challenge_id: selectedId,
        score: data.score,
        tests_passed: data.tests_passed,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingRun(false);
    }
  }

  async function handleGetHint() {
    if (!selectedId) return;

    try {
      setLoadingHint(true);
      setError("");
      const data = await api.getDebugHint({
        challenge_id: selectedId,
        hint_index: hintIndex,
        code,
      });
      setHint(data.hint);
      setHintIndex((prev) => prev + 1);

      logActivity("debug_lab_hint", {
        challenge_id: selectedId,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingHint(false);
    }
  }

  async function handleReset() {
    if (!selectedId) return;

    try {
      setError("");
      const data = await api.resetDebugChallenge(selectedId);
      setCode(data.starter_code);
      setResult(null);
      setHint("");
      setHintIndex(0);
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section className="debug-lab-page">
      <article className="card debug-lab-sidebar">
        <span className="section-kicker">Interview practice</span>
        <h2>AI Debug Lab</h2>
        <p className="section-copy">
          Practice debugging broken Python code with test cases, AI hints, and instant feedback.
        </p>

        <div className="debug-panel-stack">
          <label className="field-label" htmlFor="challenge-select">
            Challenge
          </label>
          <select
            id="challenge-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            disabled={loadingChallenges}
          >
            {loadingChallenges ? (
              <option>Loading challenges...</option>
            ) : (
              challenges.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))
            )}
          </select>

          {challenge && (
            <>
              <div className="pill-row">
                <span className="pill">{challenge.language}</span>
                <span className="pill">{challenge.difficulty}</span>
                <span className="pill">{challenge.topic}</span>
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
                  <strong>Hints Available:</strong> {challenge.hint_count}
                </p>
              </div>

              <label className="field-label" htmlFor="linked-job-id">
                Optional linked job ID
              </label>
              <input
                id="linked-job-id"
                type="number"
                placeholder="Example: 3"
                value={linkedJobId}
                onChange={(e) => setLinkedJobId(e.target.value)}
              />

              <div className="debug-action-stack">
                <button type="button" onClick={handleRunTests} disabled={loadingRun || loadingChallenge}>
                  {loadingRun ? "Running..." : "Run Tests"}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleGetHint}
                  disabled={loadingHint || loadingChallenge}
                >
                  {loadingHint ? "Loading hint..." : "Get Hint"}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={handleReset}
                  disabled={loadingChallenge}
                >
                  Reset Code
                </button>
              </div>
            </>
          )}

          {hint && (
            <div className="debug-hint-box">
              <h3>AI Hint</h3>
              <p>{hint}</p>
            </div>
          )}

          {error && <p className="error">{error}</p>}
        </div>
      </article>

      <article className="card debug-lab-main">
        <div className="debug-header-row">
          <div>
            <span className="section-kicker">Editor workspace</span>
            <h2>Code Editor</h2>
            <p className="debug-muted">{passLabel}</p>
          </div>

          {result && (
            <div className="debug-score-chip">
              Score: <strong>{result.score}</strong>
            </div>
          )}
        </div>

        <textarea
          className="debug-code-editor"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          placeholder="Challenge code will appear here..."
        />

        {result && (
          <div className="debug-results-box">
            <h3>Test Results</h3>
            <p className="debug-feedback">{result.feedback}</p>

            <div className="debug-test-list">
              {result.results.map((item, index) => (
                <div
                  key={`${index}-${item.passed ? "pass" : "fail"}`}
                  className={`debug-test-row ${item.passed ? "passed" : "failed"}`}
                >
                  <div className="debug-test-top">
                    <strong>Test {index + 1}</strong>
                    <span>{item.passed ? "Passed" : "Failed"}</span>
                  </div>

                  {item.input !== null && (
                    <p>
                      <strong>Input:</strong> {JSON.stringify(item.input)}
                    </p>
                  )}

                  {item.expected !== null && (
                    <p>
                      <strong>Expected:</strong> {JSON.stringify(item.expected)}
                    </p>
                  )}

                  {item.actual !== null && (
                    <p>
                      <strong>Actual:</strong> {JSON.stringify(item.actual)}
                    </p>
                  )}

                  {item.error && (
                    <p>
                      <strong>Error:</strong> {item.error}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
import { useState } from "react";
import { api } from "../lib/api";
import { logActivity } from "../lib/activity";

function AIAnswer({ content }) {
  return (
    <div className="ai-answer-text">
      {content.split("\n").map((line, index) => {
        const clean = line.trim();

        if (!clean) return <br key={index} />;

        if (clean.startsWith("## ")) {
          return <h3 key={index}>{clean.replace("## ", "")}</h3>;
        }

        if (clean.startsWith("- ")) {
          return <li key={index}>{clean.replace("- ", "")}</li>;
        }

        if (/^\d+\./.test(clean)) {
          return (
            <p key={index} className="ai-step">
              {clean}
            </p>
          );
        }

        return <p key={index}>{clean}</p>;
      })}
    </div>
  );
}

export default function AIChat() {
  const [jobDescription, setJobDescription] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(event) {
    event.preventDefault();

    const trimmedJD = jobDescription.trim();
    const trimmedMessage = message.trim();

    if (!trimmedJD) return alert("Please enter a job description");
    if (trimmedJD.length < 10) return alert("Job description must be at least 10 characters");
    if (!trimmedMessage) return alert("Please enter a message");

    const userMessage = { role: "user", content: trimmedMessage };

    setHistory((prev) => [...prev, userMessage]);
    setMessage("");
    setLoading(true);
    logActivity("chat_message_sent", { length: trimmedMessage.length });

    try {
      const res = await api.chatAboutJD({
        job_description: trimmedJD,
        message: trimmedMessage,
        history,
      });

      setHistory((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setHistory((prev) => prev.slice(0, -1));
      setHistory((prev) => [
  ...prev.slice(0, -1),
  userMessage,
  {
    role: "assistant",
    content:
      "## Direct Answer\nThe AI backend is not reachable right now.\n\n## What Happened\n- The frontend could not connect to the backend API.\n- Make sure FastAPI is running on port 8000.\n- Check that frontend API URL points to http://127.0.0.1:8000.\n\n## What to Practice Next\n- Restart backend and try sending your question again.",
  },
]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat-layout">
      <article className="card">
        <span className="section-kicker">Reference panel</span>
        <h2>Job Description</h2>
        <p className="section-copy">
          Paste the full role description so the chat can answer based on the actual opening.
        </p>

        <textarea
          rows={14}
          placeholder="Paste job description here"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </article>

      <article className="card">
        <span className="section-kicker">AI assistant</span>
        <h2>AI Career Chat</h2>
        <p className="section-copy">
          Ask about missing skills, projects to mention, interview preparation, or how to improve your fit.
        </p>

        <div className="chat-box">
          {history.length === 0 && (
            <p>Ask about skills, projects, interview prep, and stronger applications.</p>
          )}

          {history.map((msg, idx) =>
            msg.role === "assistant" ? (
              <div key={idx} className="bot ai-answer-card">
                <strong>AI:</strong>
                <AIAnswer content={msg.content} />
              </div>
            ) : (
              <p key={idx} className="user">
                <strong>You:</strong> {msg.content}
              </p>
            )
          )}

          {loading && (
            <p className="bot">
              <strong>AI:</strong> Thinking...
            </p>
          )}
        </div>

        <form className="inline-form" onSubmit={sendMessage}>
          <input
            placeholder="Ask a question about this JD"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button disabled={loading} type="submit">
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>
      </article>
    </section>
  );
}
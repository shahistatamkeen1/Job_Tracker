import { useState } from "react";
import { api } from "../lib/api";
import { logActivity } from "../lib/activity";

export default function AIChat() {
  const [jobDescription, setJobDescription] = useState("");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(event) {
    event.preventDefault();
    if (!jobDescription.trim() || !message.trim()) return;

    const nextHistory = [...history, { role: "user", content: message }];
    setHistory(nextHistory);
    logActivity("chat_message_sent", { length: message.length });
    setMessage("");
    setLoading(true);

    try {
      const res = await api.chatAboutJD({
        job_description: jobDescription,
        message,
        history: nextHistory,
      });
      setHistory((prev) => [...prev, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setHistory((prev) => [...prev, { role: "assistant", content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat-layout">
      <article className="card">
        <span className="section-kicker">Reference panel</span>
        <h2>Job Description</h2>
        <p className="section-copy">Paste the full role description so the chat can answer based on the actual opening.</p>
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
        <p className="section-copy">Ask about missing skills, projects to mention, interview preparation, or how to improve your fit.</p>

        <div className="chat-box">
          {history.length === 0 && <p>Ask about skills, projects, interview prep, and stronger applications.</p>}
          {history.map((msg, idx) => (
            <p key={idx} className={msg.role === "assistant" ? "bot" : "user"}>
              <strong>{msg.role === "assistant" ? "AI" : "You"}:</strong> {msg.content}
            </p>
          ))}
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
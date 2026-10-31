"use client";

import { useState } from "react";
import styles from "./curie.module.css";

type Msg = { role: "user" | "assistant"; text: string };
const ERR: Record<string, string> = { limit: "Curie has answered enough questions for your class today. Try again tomorrow!", disabled: "Your teacher has turned Curie off.", lesson: "Pick a lesson first." };

export function CurieChat({ lessons }: { lessons: { slug: string; title: string }[] }) {
  const [lesson, setLesson] = useState(lessons[0]?.slug ?? "");
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: "Hi! I'm Curie, your lab partner. I give hints, not answers. What are you working on?" }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = text.trim();
    if (!message || busy) return;
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setText("");
    setBusy(true);
    const r = await fetch("/api/curie", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, lesson }) });
    const body = await r.json().catch(() => ({}));
    setMsgs((m) => [...m, { role: "assistant", text: r.ok ? body.reply : ERR[body.error] ?? "Curie couldn't answer. Try again." }]);
    setBusy(false);
  };

  if (!lessons.length) return <p className="muted">Curie will be ready once your teacher assigns a lesson.</p>;
  return (
    <div className={`card ${styles.chat}`}>
      <div className="field">
        <label className="label" htmlFor="curie-lesson">Lesson</label>
        <select id="curie-lesson" className="select" value={lesson} onChange={(e) => setLesson(e.target.value)}>
          {lessons.map((l) => <option key={l.slug} value={l.slug}>{l.title}</option>)}
        </select>
      </div>
      <ol className={styles.log} aria-live="polite" aria-label="Conversation with Curie">
        {msgs.map((m, i) => (
          <li key={i} className={m.role === "user" ? styles.me : styles.curie}>
            <span className="sr-only">{m.role === "user" ? "You:" : "Curie:"}</span>
            {m.text}
          </li>
        ))}
        {busy && <li className={styles.curie}>Curie is thinking…</li>}
      </ol>
      <form onSubmit={send} className={styles.form}>
        <label htmlFor="curie-msg" className="sr-only">Message Curie</label>
        <input id="curie-msg" className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder="Ask about your lab…" autoComplete="off" />
        <button className="btn btn-solid" disabled={busy || !text.trim()}>Send</button>
      </form>
      <p className="hint">Don&apos;t share your name or any personal details. Your teacher can read this chat.</p>
    </div>
  );
}

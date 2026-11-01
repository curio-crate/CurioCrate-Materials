"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatBytes } from "@/lib/files";
import type { ChatMessageDTO } from "@/lib/team/chat";
import { CHAT_ACCEPT, CHAT_MAX_MB, CHAT_MAX_MESSAGE, chatFileAllowed, dmChannel, dmMembers, PUBLIC_CHANNELS } from "@/lib/team/shared";
import { Avatar } from "../Avatar";
import { useConfirm } from "../Confirm";
import { LocalTime } from "../LocalTime";
import { useLive } from "../StudioLive";

type Person = { id: string; name: string; role: string; avatarKey: string | null };
type Pending = ChatMessageDTO & { pending?: "sending" | "failed"; pct?: number; error?: string; retry?: () => void };

const POLL_MS = 2000;
const GROUP_MS = 5 * 60_000;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { cache: "no-store", ...init, headers: init?.body && typeof init.body === "string" ? { "Content-Type": "application/json" } : undefined });
  const data = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (r.status === 401) throw new Error("Your Studio sign-in expired. Sign in again.");
  if (!r.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

function putFile(url: string, file: File, headers: Record<string, string>, onPct: (n: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onPct(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload refused (${xhr.status}).`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.send(file);
  });
}

/** Message text with links made clickable. Everything is text: no HTML from messages is ever rendered. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="link">
            {p}
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}

const dayKey = (iso: string) => new Date(iso).toDateString();

export function ChatApp({ me, people, everyone, initialChannel }: { me: { id: string; name: string; isAdmin: boolean }; people: Person[]; everyone: { id: string; name: string; avatarKey: string | null }[]; initialChannel: string }) {
  const live = useLive();
  const { markChannelRead } = live;
  const confirm = useConfirm();
  const [channel, setChannel] = useState(initialChannel);
  const [messages, setMessages] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const since = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const input = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const byId = useMemo(() => new Map(everyone.map((p) => [p.id, p])), [everyone]);

  const title = useMemo(() => {
    const pub = PUBLIC_CHANNELS.find((c) => c.id === channel);
    if (pub) return { name: `# ${pub.label}`, hint: pub.hint };
    const other = dmMembers(channel)?.find((x) => x !== me.id);
    const p = people.find((x) => x.id === other) ?? (other ? byId.get(other) : null);
    return { name: p?.name ?? "Private chat", hint: `Private: only you and ${p?.name ?? "them"} can read this` };
  }, [channel, people, byId, me.id]);

  const merge = useCallback((incoming: ChatMessageDTO[]) => {
    setMessages((list) => {
      const map = new Map(list.filter((m) => !m.pending).map((m) => [m.id, m] as const));
      for (const m of incoming) {
        if (m.deleted) map.delete(m.id);
        else map.set(m.id, m);
      }
      const pending = list.filter((m) => m.pending);
      return [...[...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), ...pending];
    });
  }, []);

  // Load the conversation, then poll it.
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    since.current = null;
    atBottom.current = true;
    markChannelRead(channel);
    const url = new URL(window.location.href);
    url.searchParams.set("c", channel);
    window.history.replaceState(null, "", url);

    const tick = async () => {
      try {
        const r = await api<{ now: string; messages: ChatMessageDTO[] }>(`/api/admin/chat/messages?channel=${encodeURIComponent(channel)}${since.current ? `&since=${encodeURIComponent(since.current)}` : ""}`);
        if (stop) return;
        if (!since.current) setMessages(r.messages);
        else if (r.messages.length) merge(r.messages);
        since.current = r.now;
        setLoading(false);
        setError(null);
      } catch (e) {
        if (!stop) setError((e as Error).message);
      }
      if (!stop) timer = setTimeout(tick, document.hidden ? POLL_MS * 5 : POLL_MS);
    };
    tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [channel, merge, markChannelRead]);

  useEffect(() => () => markChannelRead(""), [markChannelRead]);

  // While chat is open, unread badges for the other conversations update every few seconds (not just every 15 s).
  const { refresh } = live;
  useEffect(() => {
    const t = setInterval(() => !document.hidden && refresh(), POLL_MS * 2);
    return () => clearInterval(t);
  }, [refresh]);

  // Stay at the bottom when new messages arrive (unless the person scrolled up to read).
  useEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  /** Switches conversation; the effect above then loads it. */
  const openChannel = (id: string) => {
    if (id === channel) return;
    setMessages([]);
    setLoading(true);
    setError(null);
    setChannel(id);
  };

  const patch = (id: string, p: Partial<Pending>) => setMessages((l) => l.map((m) => (m.id === id ? { ...m, ...p } : m)));

  const sendOne = async (body: string, file: File | null) => {
    const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
    const optimistic: Pending = { id: tempId, channel, senderId: me.id, body, file: file ? { name: file.name, bytes: file.size, isImage: false } : null, createdAt: new Date().toISOString(), deleted: false, pending: "sending", pct: file ? 0 : undefined };
    atBottom.current = true;
    setMessages((l) => [...l, optimistic]);
    const run = async () => {
      patch(tempId, { pending: "sending", error: undefined });
      try {
        let attached: { key: string; name: string } | null = null;
        if (file) {
          const target = await api<{ key: string; url: string; headers: Record<string, string> }>("/api/admin/chat/upload", { method: "POST", body: JSON.stringify({ name: file.name, size: file.size }) });
          await putFile(target.url, file, target.headers, (pct) => patch(tempId, { pct }));
          attached = { key: target.key, name: file.name };
        }
        const r = await api<{ message: ChatMessageDTO }>("/api/admin/chat/messages", { method: "POST", body: JSON.stringify({ channel, body, file: attached }) });
        setMessages((l) => {
          const rest = l.filter((m) => m.id !== tempId && m.id !== r.message.id);
          const settled = rest.filter((m) => !m.pending);
          return [...settled, r.message, ...rest.filter((m) => m.pending)];
        });
      } catch (e) {
        patch(tempId, { pending: "failed", error: (e as Error).message, retry: run });
      }
    };
    await run();
  };

  const send = async () => {
    const body = text.trim();
    if (!body && !files.length) return;
    if (body.length > CHAT_MAX_MESSAGE) return setError(`Messages can be up to ${CHAT_MAX_MESSAGE} characters.`);
    const queue = files;
    setText("");
    setFiles([]);
    input.current?.focus();
    // The text goes with the first file (or alone); each further file is its own message.
    if (!queue.length) await sendOne(body, null);
    else await Promise.all(queue.map((f, i) => sendOne(i === 0 ? body : "", f)));
  };

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      if (!chatFileAllowed(f.name)) setError(`“${f.name}” can't be sent in chat. Zip it first.`);
      else if (f.size > CHAT_MAX_MB * 1024 * 1024) setError(`“${f.name}” is over ${CHAT_MAX_MB} MB.`);
      else ok.push(f);
    }
    setFiles((cur) => [...cur, ...ok].slice(0, 10));
  };

  const remove = async (m: Pending) => {
    if (m.pending) return setMessages((l) => l.filter((x) => x.id !== m.id));
    const what = m.file ? `“${m.file.name}”` : "this message";
    if (!(await confirm({ title: `Are you sure you want to delete ${what}?`, message: "It disappears from the conversation for everyone. An admin can restore it from Recently deleted for 30 days." }))) return;
    try {
      await api(`/api/admin/chat/messages/${m.id}`, { method: "DELETE" });
      setMessages((l) => l.filter((x) => x.id !== m.id));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const channelButton = (id: string, label: ReactNode, unread: number, extra?: ReactNode) => (
    <li key={id}>
      <button type="button" className="st-chatChan" aria-current={channel === id ? "true" : undefined} onClick={() => openChannel(id)}>
        {extra}
        <span className="st-chatChanName">{label}</span>
        {unread > 0 && channel !== id && (
          <span className="st-badge">
            {unread}
            <span className="sr-only"> unread</span>
          </span>
        )}
      </button>
    </li>
  );

  return (
    <div className="st-chat">
      <aside className="st-chatSide" aria-label="Conversations">
        <h1 className="st-chatTitle">Chat</h1>
        <p className="st-chatLabel" id="chan-h">
          Channels
        </p>
        <ul className="st-chatList" aria-labelledby="chan-h">
          {PUBLIC_CHANNELS.map((c) => channelButton(c.id, `# ${c.label}`, live.chat[c.id] ?? 0))}
        </ul>
        <p className="st-chatLabel" id="dm-h">
          Direct messages
        </p>
        <ul className="st-chatList" aria-labelledby="dm-h">
          {people.map((p) => {
            const id = dmChannel(me.id, p.id);
            return channelButton(
              id,
              <>
                {p.name}
                <span className="st-chatRole">{p.role}</span>
              </>,
              live.chat[id] ?? 0,
              <Avatar person={p} size={24} />,
            );
          })}
          {!people.length && <li className="hint" style={{ padding: "4px 10px" }}>Add teammates in Team &amp; roles.</li>}
        </ul>
      </aside>

      <section
        className="st-chatMain"
        aria-label={title.name}
        data-over={over || undefined}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
      >
        <header className="st-chatHead">
          <h2 className="st-chatHeadName">{title.name}</h2>
          <span className="hint">{title.hint}</span>
        </header>

        <div
          ref={scroller}
          className="st-chatScroll"
          onScroll={(e) => {
            const el = e.currentTarget;
            atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
          }}
        >
          {loading && <p className="st-chatEmpty">Loading…</p>}
          {!loading && !messages.length && <p className="st-chatEmpty">No messages yet. Say hello.</p>}
          <ol className="st-msgs" aria-live="polite" aria-relevant="additions">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
              const grouped = !newDay && prev && prev.senderId === m.senderId && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_MS;
              const who = byId.get(m.senderId) ?? { id: m.senderId, name: "Former member", avatarKey: null };
              const mine = m.senderId === me.id;
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <li className="st-msgDay" aria-hidden="true">
                      <LocalTime iso={m.createdAt} format="date" />
                    </li>
                  )}
                  <li className={`st-msg ${grouped ? "st-msgGrouped" : ""} ${m.pending ? "st-msgPending" : ""}`}>
                    <span className="st-msgAvatar">{!grouped && <Avatar person={who} size={34} />}</span>
                    <div className="st-msgBody">
                      {!grouped && (
                        <div className="st-msgMeta">
                          <span className="st-msgName">{mine ? "You" : who.name}</span>
                          <span className="st-msgTime">
                            <LocalTime iso={m.createdAt} format="time" />
                          </span>
                        </div>
                      )}
                      {grouped && <span className="sr-only">{mine ? "You" : who.name}: </span>}
                      {m.body && (
                        <p className="st-msgText">
                          <Linkified text={m.body} />
                        </p>
                      )}
                      {m.file &&
                        (m.file.isImage && !m.pending ? (
                          <a href={`/api/admin/chat/file/${m.id}`} target="_blank" rel="noopener noreferrer" className="st-msgImage">
                            {/* eslint-disable-next-line @next/next/no-img-element -- served from our own signed route, any size */}
                            <img src={`/api/admin/chat/file/${m.id}`} alt={m.file.name} loading="lazy" />
                          </a>
                        ) : (
                          <a className="st-msgFile" href={m.pending ? undefined : `/api/admin/chat/file/${m.id}?download=1`} aria-disabled={m.pending ? true : undefined}>
                            <Icon name="pdf" size={20} />
                            <span className="st-msgFileName">{m.file.name}</span>
                            <span className="hint">{m.pending === "sending" && m.pct !== undefined && m.pct < 100 ? `${m.pct}%` : formatBytes(m.file.bytes)}</span>
                            {!m.pending && <Icon name="download" size={16} />}
                          </a>
                        ))}
                      {m.pending === "failed" && (
                        <p className="st-msgFail" role="alert">
                          Not sent: {m.error}{" "}
                          {m.retry && (
                            <button type="button" className="text-link" onClick={m.retry}>
                              Retry
                            </button>
                          )}
                        </p>
                      )}
                    </div>
                    {(mine || me.isAdmin) && m.pending !== "sending" && (
                      <button type="button" className="st-msgDelete" onClick={() => remove(m)} aria-label={`Delete ${m.file ? m.file.name : "message"}`}>
                        <Icon name="trash" size={15} />
                      </button>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </ol>
        </div>

        {error && (
          <p className="st-chatError" role="alert">
            {error}{" "}
            <button type="button" className="text-link" onClick={() => setError(null)}>
              Dismiss
            </button>
          </p>
        )}

        <form
          className="st-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {!!files.length && (
            <ul className="st-composerFiles" aria-label="Files to send">
              {files.map((f, i) => (
                <li key={`${f.name}-${i}`} className="st-composerFile">
                  <Icon name="clip" size={14} />
                  <span>{f.name}</span>
                  <span className="hint">{formatBytes(f.size)}</span>
                  <button type="button" className="st-close" aria-label={`Don't send ${f.name}`} onClick={() => setFiles((l) => l.filter((_, j) => j !== i))}>
                    <Icon name="x" size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="st-composerRow">
            <button type="button" className="st-composerBtn" onClick={() => fileInput.current?.click()} aria-label="Attach files">
              <Icon name="clip" size={19} />
            </button>
            <input ref={fileInput} type="file" multiple accept={CHAT_ACCEPT} hidden onChange={(e) => (addFiles(e.target.files), (e.target.value = ""))} />
            <label htmlFor="chat-input" className="sr-only">
              Message {title.name}
            </label>
            <textarea
              id="chat-input"
              ref={input}
              className="st-composerInput"
              rows={1}
              value={text}
              maxLength={CHAT_MAX_MESSAGE}
              placeholder={`Message ${title.name}`}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send();
                }
              }}
              onPaste={(e) => {
                if (e.clipboardData.files.length) {
                  e.preventDefault();
                  addFiles(e.clipboardData.files);
                }
              }}
            />
            <button type="submit" className="st-composerSend" disabled={!text.trim() && !files.length} aria-label="Send">
              <Icon name="send" size={18} />
            </button>
          </div>
          <p className="st-composerHint hint">Enter to send · Shift+Enter for a new line · drop or paste files (up to {CHAT_MAX_MB} MB)</p>
        </form>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

// Keeps the sidebar badges (Inbox, Chat, To-dos) current on every Studio page, and pops up a small toast when a
// notification arrives. Polls /api/admin/pulse (every 15 s while the tab is visible, at once when it regains focus).

export type Pulse = { inbox: number; chat: Record<string, number>; tasks: number };
type Toast = { id: string; kind: string; title: string; body: string; link: string | null };
type Live = Pulse & { refresh: () => void; markChannelRead: (channel: string) => void };

const Ctx = createContext<Live>({ inbox: 0, chat: {}, tasks: 0, refresh: () => {}, markChannelRead: () => {} });
export const useLive = () => useContext(Ctx);

const ICON: Record<string, string> = { task_assigned: "todo", task_done: "check", task_overdue: "clock", kit_created: "box", login: "user", security: "shield" };

export function StudioLive({ initial, children }: { initial: Pulse; children: ReactNode }) {
  const [pulse, setPulse] = useState<Pulse>(initial);
  const [toasts, setToasts] = useState<Toast[]>([]);
  // A server re-render (e.g. after "Mark all as read") brings fresh counts: take them.
  const initialKey = `${initial.inbox}|${initial.tasks}|${JSON.stringify(initial.chat)}`;
  const [seenKey, setSeenKey] = useState(initialKey);
  if (seenKey !== initialKey) {
    setSeenKey(initialKey);
    setPulse(initial);
  }
  const since = useRef(new Date().toISOString());
  const openChannel = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/pulse?since=${encodeURIComponent(since.current)}`, { cache: "no-store" });
      if (!r.ok) return;
      const p = (await r.json()) as Pulse & { now: string; fresh: Toast[] };
      since.current = p.now;
      const chat = { ...p.chat };
      if (openChannel.current) delete chat[openChannel.current]; // the conversation on screen is being read
      setPulse({ inbox: p.inbox, chat, tasks: p.tasks });
      if (p.fresh.length) {
        setToasts((t) => [...p.fresh.filter((f) => !t.some((x) => x.id === f.id)), ...t].slice(0, 3));
        for (const f of p.fresh) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== f.id)), 7000);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(async () => {
        await refresh();
        loop();
      }, document.hidden ? 60_000 : 15_000);
    };
    loop();
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const markChannelRead = useCallback((channel: string) => {
    openChannel.current = channel || null;
    if (channel) setPulse((p) => (p.chat[channel] ? { ...p, chat: { ...p.chat, [channel]: 0 } } : p));
  }, []);

  return (
    <Ctx.Provider value={{ ...pulse, refresh, markChannelRead }}>
      {children}
      <div className="st-toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="st-toast">
            <span className="st-toastIcon" aria-hidden="true">
              <Icon name={ICON[t.kind] ?? "bell"} size={17} />
            </span>
            <span className="st-toastText">
              {t.link ? (
                <Link href={t.link} className="st-toastTitle" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                  {t.title}
                </Link>
              ) : (
                <span className="st-toastTitle">{t.title}</span>
              )}
              {t.body && <span className="st-toastBody">{t.body}</span>}
            </span>
            <button type="button" className="st-close" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
              <Icon name="x" size={15} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

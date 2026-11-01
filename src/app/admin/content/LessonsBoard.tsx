"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { MATERIAL } from "@/lib/materials";
import { StudioHead } from "../StudioHead";
import { LessonPanel, materialLabel, TIER_TEXT, type PanelKit, type PanelLesson } from "./LessonPanel";

const TYPE_TEXT: Record<string, string> = { interactive: "Interactive lesson", instructions: "Text lesson", training: "Training course" };

export function LessonsBoard({ kits, lessons, open: initialOpen }: { kits: PanelKit[]; lessons: PanelLesson[]; open: string | null }) {
  const router = useRouter();
  const path = usePathname();
  const [kit, setKit] = useState<string>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(initialOpen);
  const [toast, setToast] = useState<string | null>(null);
  const kitName = useMemo(() => new Map(kits.map((k) => [k.id, k.name])), [kits]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const needle = q.trim().toLowerCase();
  const shown = lessons.filter(
    (l) =>
      (kit === "all" || (kit === "none" ? !l.kitId : l.kitId === kit)) &&
      (!needle || l.title.toLowerCase().includes(needle) || l.summary.toLowerCase().includes(needle) || l.ngss.some((c) => c.toLowerCase().includes(needle))),
  );
  const current = open && open !== "new" ? (lessons.find((l) => l.id === open) ?? null) : null;

  const closePanel = () => {
    setOpen(null);
    router.replace(path, { scroll: false });
  };

  return (
    <>
      <StudioHead title="Lessons" sub="Every lesson teachers can open, with its activity and materials. Changes go live as soon as you save.">
        <button type="button" className="btn btn-solid" onClick={() => setOpen("new")}>
          <Icon name="plus" size={16} /> Create a new lesson
        </button>
      </StudioHead>

      <div className="st-toolbar">
        <div className="st-chips" role="group" aria-label="Filter by kit">
          {[{ id: "all", name: "All" }, ...kits, { id: "none", name: "Professional learning" }].map((k) => (
            <button key={k.id} type="button" className="st-chip" aria-pressed={kit === k.id} onClick={() => setKit(k.id)}>
              {k.name}
            </button>
          ))}
        </div>
        <div className="st-search">
          <Icon name="search" size={15} />
          <label className="sr-only" htmlFor="lesson-q">
            Search lessons
          </label>
          <input id="lesson-q" className="input" placeholder="Search title or NGSS code" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <ul className="st-list" aria-label="Lessons">
        {shown.map((l, i) => (
          <li key={l.id}>
            <button type="button" className="st-row" style={{ animationDelay: `${Math.min(i, 12) * 0.02}s` }} onClick={() => setOpen(l.id)}>
              <span className="st-rowIcon" aria-hidden="true">
                <Icon name={l.type} size={20} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span className="st-rowTitle">{l.title}</span>
                <span className="st-rowMeta">
                  {l.kitId ? kitName.get(l.kitId) : "Professional learning"} · {TYPE_TEXT[l.type] ?? l.type}
                  {l.minutes ? ` · ${l.minutes} min` : ""}
                  {l.ngss.length ? ` · NGSS ${l.ngss.filter((c) => !c.startsWith("SEP") && !c.startsWith("CCC")).join(", ") || l.ngss[0]}` : ""}
                </span>
              </span>
              <span className="st-rowMats" aria-label={l.materials.length ? `${l.materials.length} material${l.materials.length === 1 ? "" : "s"}` : "No materials"}>
                {l.materials.slice(0, 5).map((m) => (
                  <span key={m.id} className="st-rowMat" title={`${materialLabel(m)}: ${m.title}`}>
                    <Icon name={m.kind ? MATERIAL[m.kind].icon : m.type === "video" ? "video" : "pdf"} size={14} />
                  </span>
                ))}
                {l.materials.length > 5 && <span className="st-rowMat">+{l.materials.length - 5}</span>}
              </span>
              <span className={`st-pill st-rowTier ${l.tier === "free" ? "" : l.tier === "kit_owner" ? "st-pill-ok" : "st-pill-warn"}`}>{TIER_TEXT[l.tier]}</span>
              <span className="st-rowGo" aria-hidden="true">
                <Icon name="chevron" size={18} />
              </span>
            </button>
          </li>
        ))}
        {!shown.length && (
          <li className="st-empty">
            {lessons.length ? "No lessons match." : "No lessons yet."}{" "}
            <button type="button" className="text-link" onClick={() => setOpen("new")}>
              Create one
            </button>
          </li>
        )}
      </ul>

      {open && (open === "new" || current) && (
        <LessonPanel
          key={open}
          lesson={current}
          kits={kits}
          defaultKitId={kit !== "all" && kit !== "none" ? kit : undefined}
          onClose={closePanel}
          onSaved={(msg) => {
            setToast(msg);
            router.refresh();
          }}
        />
      )}

      {toast && (
        <div className="st-toast" role="status">
          <Icon name="check" size={16} /> {toast}
        </div>
      )}
    </>
  );
}

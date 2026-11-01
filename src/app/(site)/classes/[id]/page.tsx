import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/app/admin/Notice";
import adminStyles from "@/app/admin/admin.module.css";
import { CopyCode } from "@/app/(site)/dashboard/CopyCode";
import { PageHead } from "@/components/ui/PageHead";
import { requireSchool } from "@/lib/auth/viewer";
import { assignments, classResults, ownedClass, studentCount } from "@/lib/classes";
import { isShipped, listAllContent, TYPE_LABEL } from "@/lib/content";
import { classConversations, usageToday } from "@/lib/curie";
import { features } from "@/lib/features";
import { viewerAccess } from "@/lib/viewer-grants";
import { assignAction, curieAction } from "../actions";

export const metadata: Metadata = { title: "Class" };

export default async function ClassPage(props: PageProps<"/classes/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const v = await requireSchool(`/classes/${id}`);
  const c = await ownedClass(id, v.teacher.id);
  if (!c) notFound();
  const [assigned, all, access, results, students, convo, used] = await Promise.all([assignments(c.id), listAllContent(), viewerAccess(), classResults(c.id), studentCount(c.id), classConversations(c.id), usageToday(c.id)]);
  const assignedIds = new Set(assigned.map((a) => a.item.id));
  const assignable = all.filter((i) => !i.parentId && i.type !== "training" && isShipped(i) && access.state(i) === "open");

  return (
    <div className="container">
      <PageHead eyebrow="Class" size="h1" title={c.name} lead={`${students} student device${students === 1 ? "" : "s"} joined. Students go to materials.curiocrate.org/join and type the code.`} />
      <Notice sp={sp} />
      <div className={adminStyles.grid2}>
        <section className={`card ${adminStyles.panel}`} aria-labelledby="assign-h">
          <h2 id="assign-h" className="h3">Assigned to students</h2>
          <ul className="stack" style={{ gap: 8 }}>
            {assignable.map((i) => (
              <li key={i.id} className={adminStyles.inline} style={{ justifyContent: "space-between" }}>
                <span>
                  <strong>{i.title}</strong> <span className="hint">{TYPE_LABEL[i.type]}</span>
                </span>
                <form action={assignAction}>
                  <input type="hidden" name="classId" value={c.id} />
                  <input type="hidden" name="contentId" value={i.id} />
                  <input type="hidden" name="on" value={assignedIds.has(i.id) ? "0" : "1"} />
                  <button className={`btn btn-xs ${assignedIds.has(i.id) ? "btn-kit" : ""}`} aria-pressed={assignedIds.has(i.id)} aria-label={`${assignedIds.has(i.id) ? "Unassign" : "Assign"} ${i.title}`}>
                    {assignedIds.has(i.id) ? "Assigned ✓" : "Assign"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
        <div className="stack" style={{ gap: 20 }}>
          <section className={`card ${adminStyles.panel}`} aria-label="Class code">
            <span className="eyebrow">Class code</span>
            <CopyCode code={c.classCode} />
          </section>
          {features.curie && (
            <section className={`card ${adminStyles.panel}`} aria-labelledby="curie-h">
              <h2 id="curie-h" className="h4">Curie.AI</h2>
              <p className="hint">Off by default. Gives hints, not answers, and stays on assigned lessons. {used}/{c.curieDailyLimit} messages used today.</p>
              <form action={curieAction} className={adminStyles.form}>
                <input type="hidden" name="classId" value={c.id} />
                <input type="hidden" name="enabled" value={c.curieEnabled ? "0" : "1"} />
                <div className="field">
                  <label className="label" htmlFor="limit">Daily message limit for the class</label>
                  <input id="limit" name="limit" type="number" min={10} max={2000} className="input" defaultValue={c.curieDailyLimit} />
                </div>
                <button className={`btn btn-sm ${c.curieEnabled ? "btn-danger" : "btn-solid"}`}>{c.curieEnabled ? "Turn Curie.AI off" : "Turn Curie.AI on"}</button>
              </form>
            </section>
          )}
        </div>
      </div>

      <section className={adminStyles.section} aria-labelledby="res-h">
        <h2 id="res-h" className="h3">Lab results</h2>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th scope="col">Student</th><th scope="col">Lab</th><th scope="col">Results</th><th scope="col">When</th></tr></thead>
            <tbody>
              {results.map(({ run, nickname }) => (
                <tr key={run.id}><td>{nickname}</td><td>{run.labSlug}</td><td className="hint">{Object.entries(run.data).map(([k, val]) => `${k}: ${Array.isArray(val) ? val.join(" ") : val}`).join(" · ")}</td><td>{run.createdAt.toLocaleString()}</td></tr>
              ))}
              {!results.length && <tr><td colSpan={4} className={adminStyles.empty}>No results yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {features.curie && (
        <section className={adminStyles.section} aria-labelledby="conv-h">
          <h2 id="conv-h" className="h3">Curie.AI conversations</h2>
          <p className="hint" style={{ marginBottom: 12 }}>Deleted automatically after the retention period. Never used to train AI.</p>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th scope="col">Student</th><th scope="col">Who</th><th scope="col">Message</th><th scope="col">Note</th></tr></thead>
              <tbody>
                {convo.map((m) => (
                  <tr key={m.id}><td>{m.nickname ?? "—"}</td><td>{m.role === "user" ? "Student" : "Curie"}</td><td>{m.content}</td><td className="hint">{m.flagged ?? ""}</td></tr>
                ))}
                {!convo.length && <tr><td colSpan={4} className={adminStyles.empty}>No conversations yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

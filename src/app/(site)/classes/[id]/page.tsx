import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Notice } from "@/app/admin/Notice";
import { CopyCode } from "@/app/(site)/dashboard/CopyCode";
import { Icon } from "@/components/ui/Icon";
import { PageHead } from "@/components/ui/PageHead";
import { requireSchool } from "@/lib/auth/viewer";
import { MAX_STUDENTS_PER_CLASS } from "@/lib/class-limits";
import { assignments, classResults, classRoster, ownedClass } from "@/lib/classes";
import { contentHref, isShipped, listAllContent, listKits, TYPE_LABEL } from "@/lib/content";
import { classConversations, usageToday } from "@/lib/curie";
import { features } from "@/lib/features";
import { viewerAccess } from "@/lib/viewer-grants";
import { assignAction, curieAction, deleteClassAction, newCodeAction, removeStudentAction, renameClassAction } from "../actions";
import styles from "../classes.module.css";

export const metadata: Metadata = { title: "Class" };

const day = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default async function ClassPage(props: PageProps<"/classes/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const v = await requireSchool(`/classes/${id}`);
  const c = await ownedClass(id, v.teacher.id);
  if (!c) notFound();
  const [assigned, all, kits, access, results, roster, convo, used] = await Promise.all([assignments(c.id), listAllContent(), listKits(), viewerAccess(), classResults(c.id), classRoster(c.id), classConversations(c.id), usageToday(c.id)]);
  const assignedIds = new Set(assigned.map((a) => a.item.id));
  const assignable = all.filter((i) => !i.parentId && i.type !== "training" && isShipped(i) && access.state(i) === "open");
  const groups = kits.map((k) => ({ kit: k, items: assignable.filter((i) => i.kitId === k.id) })).filter((g) => g.items.length);
  const full = roster.length >= MAX_STUDENTS_PER_CLASS;

  return (
    <div className="container-wide">
      <Link href="/classes" className={styles.back}>
        <Icon name="back" size={15} /> All classes
      </Link>
      <PageHead eyebrow="Class" size="h1" title={c.name} lead="Students go to materials.curiocrate.org/join and type the class code. They see only what you assign below." />
      <Notice sp={sp} />

      <div className={styles.top}>
        <section className={`card ${styles.tile}`} aria-label="Class code">
          <span className={styles.tileLabel}>Class code</span>
          <CopyCode code={c.classCode} />
          <form action={newCodeAction}>
            <input type="hidden" name="classId" value={c.id} />
            <button className="text-link" type="submit">
              Make a new code
            </button>
          </form>
        </section>
        <section className={`card ${styles.tile}`} aria-label="Seats">
          <span className={styles.tileLabel}>Students</span>
          <span className={styles.bigNum}>
            {roster.length} <small>/ {MAX_STUDENTS_PER_CLASS}</small>
          </span>
          <span className={`${styles.meter} ${full ? styles.meterFull : ""}`} aria-hidden="true">
            <span style={{ width: `${Math.min(100, (roster.length / MAX_STUDENTS_PER_CLASS) * 100)}%` }} />
          </span>
          {full && <span className="hint">Class is full. Remove a student to free a seat.</span>}
        </section>
        <section className={`card ${styles.tile}`} aria-label="Assigned">
          <span className={styles.tileLabel}>Assigned</span>
          <span className={styles.bigNum}>{assignedIds.size}</span>
          <span className="hint">lessons, labs and handouts</span>
        </section>
      </div>

      <section className={styles.section} aria-labelledby="assign-h">
        <div className={styles.sectionHead}>
          <h2 id="assign-h" className="h2">
            What students see
          </h2>
          <p>Switch on what this class should open. Only kits on your account are listed.</p>
        </div>
        {groups.map(({ kit, items }) => (
          <div key={kit.id} className={styles.kitGroup}>
            <h3>{kit.name}</h3>
            <ul className={styles.assignList}>
              {items.map((i) => {
                const on = assignedIds.has(i.id);
                return (
                  <li key={i.id} className={`${styles.assignRow} ${on ? styles.assignOn : ""}`}>
                    <span className={styles.assignIcon} aria-hidden="true">
                      <Icon name={i.type} size={16} />
                    </span>
                    <span className={styles.assignTitle}>
                      <Link href={contentHref(i)}>{i.title}</Link>
                      <span>
                        {TYPE_LABEL[i.type]}
                        {i.minutes ? ` · ${i.minutes} min` : ""}
                      </span>
                    </span>
                    <form action={assignAction}>
                      <input type="hidden" name="classId" value={c.id} />
                      <input type="hidden" name="contentId" value={i.id} />
                      <input type="hidden" name="on" value={on ? "0" : "1"} />
                      <button className={styles.switch} aria-pressed={on} aria-label={`${on ? "Unassign" : "Assign"} ${i.title}`} />
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {!groups.length && (
          <p className="muted">
            Nothing to assign yet. <Link href="/redeem" className="link">Redeem a kit code</Link> to add a kit.
          </p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="roster-h">
        <div className={styles.sectionHead}>
          <h2 id="roster-h" className="h2">
            Students
          </h2>
          <p>Each device that joins gets a nickname. Remove one to free its seat (its results go with it).</p>
        </div>
        {roster.length ? (
          <ul className={styles.roster}>
            {roster.map((st) => (
              <li key={st.id} className={styles.student}>
                <span>
                  <strong>{st.nickname}</strong>
                  <span>Joined {day(st.joinedAt)}</span>
                </span>
                <form action={removeStudentAction}>
                  <input type="hidden" name="classId" value={c.id} />
                  <input type="hidden" name="studentId" value={st.id} />
                  <button className={styles.iconBtn} aria-label={`Remove ${st.nickname}`} title="Remove">
                    <Icon name="x" size={15} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No students yet. Share the code above.</p>
        )}
      </section>

      <section className={styles.section} aria-labelledby="res-h">
        <div className={styles.sectionHead}>
          <h2 id="res-h" className="h2">
            Lab results
          </h2>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Lab</th>
                <th scope="col">Results</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {results.map(({ run, nickname }) => (
                <tr key={run.id}>
                  <td>{nickname}</td>
                  <td>{run.labSlug}</td>
                  <td className="hint">
                    {Object.entries(run.data)
                      .map(([k, val]) => `${k}: ${Array.isArray(val) ? val.join(" ") : val}`)
                      .join(" · ")}
                  </td>
                  <td>{run.createdAt.toLocaleString()}</td>
                </tr>
              ))}
              {!results.length && (
                <tr>
                  <td colSpan={4} className={styles.empty}>
                    No results yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {features.curie && (
        <section className={styles.section} aria-labelledby="curie-h">
          <div className={styles.sectionHead}>
            <h2 id="curie-h" className="h2">
              Curie.AI
            </h2>
            <p>Off by default. Gives hints, not answers, and stays on assigned lessons. {used}/{c.curieDailyLimit} messages used today.</p>
          </div>
          <form action={curieAction} className={`card ${styles.tile}`}>
            <input type="hidden" name="classId" value={c.id} />
            <input type="hidden" name="enabled" value={c.curieEnabled ? "0" : "1"} />
            <div className={styles.tileRow}>
              <div className="field" style={{ flex: "1 1 220px" }}>
                <label className="label" htmlFor="limit">
                  Daily message limit for the class
                </label>
                <input id="limit" name="limit" type="number" min={10} max={2000} className="input" defaultValue={c.curieDailyLimit} />
              </div>
              <button className={`btn ${c.curieEnabled ? "btn-danger" : "btn-solid"}`} style={{ alignSelf: "flex-end" }}>
                {c.curieEnabled ? "Turn Curie.AI off" : "Turn Curie.AI on"}
              </button>
            </div>
          </form>
          <details className={styles.details} open={convo.length > 0}>
            <summary>Conversations ({convo.length})</summary>
            <p className="hint" style={{ marginBottom: 12 }}>
              Deleted automatically after the retention period. Never used to train AI.
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">Who</th>
                    <th scope="col">Message</th>
                    <th scope="col">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {convo.map((m) => (
                    <tr key={m.id}>
                      <td>{m.nickname ?? "—"}</td>
                      <td>{m.role === "user" ? "Student" : "Curie"}</td>
                      <td>{m.content}</td>
                      <td className="hint">{m.flagged ?? ""}</td>
                    </tr>
                  ))}
                  {!convo.length && (
                    <tr>
                      <td colSpan={4} className={styles.empty}>
                        No conversations yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}

      <details className={styles.details}>
        <summary>Class settings</summary>
        <form action={renameClassAction} className={`card ${styles.tile}`}>
          <input type="hidden" name="classId" value={c.id} />
          <div className={styles.tileRow}>
            <div className="field" style={{ flex: "1 1 260px" }}>
              <label className="label" htmlFor="rename">
                Class name
              </label>
              <input id="rename" name="name" className="input" defaultValue={c.name} required maxLength={60} />
            </div>
            <button className="btn" style={{ alignSelf: "flex-end" }}>
              Rename
            </button>
          </div>
        </form>
        <form action={deleteClassAction} className={styles.danger}>
          <input type="hidden" name="classId" value={c.id} />
          <label className="checkbox">
            <input type="checkbox" name="confirm" required />
            <span>Delete this class, its students, results and chats. This can&apos;t be undone.</span>
          </label>
          <button className="btn btn-sm btn-danger">Delete class</button>
        </form>
      </details>
    </div>
  );
}

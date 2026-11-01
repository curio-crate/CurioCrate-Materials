import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { canAssignTasks, canSeeDepartmentTasks, departmentOf, DEPARTMENT_LABEL, DEPARTMENTS, receivesTasks, ROLE_LABEL, type Department } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/viewer";
import { assignableDirectors, visibleTasks } from "@/lib/team/tasks";
import { Avatar } from "../Avatar";
import { ConfirmSubmit } from "../Confirm";
import { LocalTime } from "../LocalTime";
import { Notice } from "../Notice";
import { StudioHead } from "../StudioHead";
import { AssignForm } from "./AssignForm";
import { completeTaskAction, removeTaskAction, reopenTaskAction } from "./actions";

export const metadata = { title: "To-dos" };

type Task = Awaited<ReturnType<typeof visibleTasks>>[number];

export default async function TasksPage(props: PageProps<"/admin/tasks">) {
  const actor = await requireAdmin();
  const sp = await props.searchParams;
  const both = DEPARTMENTS.filter((d) => canSeeDepartmentTasks(actor.role, d));
  const dept = both.length > 1 && DEPARTMENTS.includes(sp.d as Department) ? (sp.d as Department) : null;
  const assigner = canAssignTasks(actor.role);
  const [all, directors] = await Promise.all([visibleTasks(actor), assigner ? assignableDirectors() : []]);
  const tasks = all.filter((t) => !dept || t.department === dept);
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done").sort((a, b) => (b.doneAt?.getTime() ?? 0) - (a.doneAt?.getTime() ?? 0)).slice(0, 30);
  const now = new Date().getTime();
  const myDept = departmentOf(actor.role);

  const card = (t: Task) => {
    const mine = t.assigneeId === actor.adminId;
    const late = t.status === "open" && t.dueAt.getTime() < now;
    const soon = t.status === "open" && !late && t.dueAt.getTime() - now < 2 * 86400_000;
    return (
      <li key={t.id} id={`task-${t.id}`} className={`st-task ${t.status === "done" ? "st-taskDone" : ""} ${mine ? "st-taskMine" : ""}`}>
        <div className="st-taskMain">
          <div className="st-taskTop">
            <span className="st-taskTitle">{t.title}</span>
            {late && <span className="st-pill st-pill-bad">Overdue</span>}
            {soon && <span className="st-pill st-pill-warn">Due soon</span>}
            {t.status === "done" && <span className="st-pill st-pill-ok">Done</span>}
            {both.length > 1 && <span className="st-pill st-pill-muted">{DEPARTMENT_LABEL[t.department]}</span>}
          </div>
          {t.notes && <p className="st-taskNotes">{t.notes}</p>}
          <div className="st-taskPeople">
            <span className="st-taskWho">
              <Avatar person={t.assignee} size={22} />
              <span>
                {mine ? "You" : t.assignee.name} <span className="hint">· {t.assignee.role}</span>
              </span>
            </span>
            <span className="hint">
              <Icon name="calendar" size={13} /> Due <LocalTime iso={t.dueAt.toISOString()} />
            </span>
            <span className="hint">
              Given by {t.giver ? (t.giver.id === actor.adminId ? "you" : `${t.giver.name}${t.giver.role ? ` (${t.giver.role})` : ""}`) : "a former member"}
            </span>
            {t.doneAt && (
              <span className="hint">
                Done <LocalTime iso={t.doneAt.toISOString()} />
              </span>
            )}
          </div>
        </div>
        <div className="st-taskActions">
          {t.status === "open" && (mine || actor.role === "admin") && (
            <form action={completeTaskAction}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="d" value={dept ?? ""} />
              <button className="btn btn-sm btn-solid">
                <Icon name="check" size={15} /> Done
              </button>
            </form>
          )}
          {t.status === "done" && (mine || t.giver?.id === actor.adminId || actor.role === "admin") && (
            <form action={reopenTaskAction}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="d" value={dept ?? ""} />
              <button className="btn btn-xs">Reopen</button>
            </form>
          )}
          {(t.giver?.id === actor.adminId || actor.role === "admin") && (
            <form action={removeTaskAction}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="d" value={dept ?? ""} />
              <ConfirmSubmit className="btn btn-xs btn-danger" aria-label={`Delete ${t.title}`} title={`Are you sure you want to delete “${t.title}”?`} message="The to-do is removed for everyone. This can't be undone.">
                Delete
              </ConfirmSubmit>
            </form>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <Notice sp={sp} />
      <StudioHead
        title="To-dos"
        sub={
          assigner
            ? "Give Directors of Curriculum and Product Officers to-dos with a deadline. You're notified the moment they're done."
            : receivesTasks(actor.role)
              ? "To-dos the heads gave you and your department. Mark yours done when they're finished."
              : `What the heads have given the ${myDept ? DEPARTMENT_LABEL[myDept].toLowerCase() : ""} department, with deadlines.`
        }
      />

      {assigner && (
        <section className="st-section" style={{ marginTop: 0, marginBottom: 28 }}>
          <AssignForm directors={directors.map((d) => ({ id: d.id, name: d.name, roleLabel: ROLE_LABEL[d.role], department: DEPARTMENT_LABEL[departmentOf(d.role)!] }))} dept={dept ?? ""} />
        </section>
      )}

      {both.length > 1 && (
        <nav className="st-chips" aria-label="Department" style={{ marginBottom: 18 }}>
          <Link className="st-chip" href="/admin/tasks" aria-current={!dept ? "page" : undefined}>
            All
          </Link>
          {both.map((d) => (
            <Link key={d} className="st-chip" href={`/admin/tasks?d=${d}`} aria-current={dept === d ? "page" : undefined}>
              {DEPARTMENT_LABEL[d]}
            </Link>
          ))}
        </nav>
      )}

      <section aria-labelledby="open-h">
        <div className="st-sectionHead">
          <h2 id="open-h" className="st-h2">
            Open
          </h2>
          <span className="hint">{open.length}</span>
        </div>
        {open.length ? <ul className="st-tasks">{open.map(card)}</ul> : <p className="st-card st-empty">Nothing open. {assigner ? "Give someone a to-do above." : ""}</p>}
      </section>

      {!!done.length && (
        <section className="st-section" aria-labelledby="done-h">
          <div className="st-sectionHead">
            <h2 id="done-h" className="st-h2">
              Done
            </h2>
            <span className="hint">latest {done.length}</span>
          </div>
          <ul className="st-tasks">{done.map(card)}</ul>
        </section>
      )}
    </>
  );
}

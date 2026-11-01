import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/auth/viewer";
import { listNotifications } from "@/lib/team/notify";
import { taskStates } from "@/lib/team/tasks";
import { LocalTime } from "../LocalTime";
import { StudioHead } from "../StudioHead";
import { clearReadAction, markAllReadAction, openNotificationAction } from "./actions";

export const metadata = { title: "Inbox" };

const KIND: Record<string, { icon: string; label: string }> = {
  task_assigned: { icon: "todo", label: "To-do" },
  task_done: { icon: "check", label: "Done" },
  task_overdue: { icon: "clock", label: "Overdue" },
  kit_created: { icon: "box", label: "New kit" },
  login: { icon: "user", label: "Sign-in" },
  security: { icon: "shield", label: "Security" },
};

export default async function InboxPage() {
  const actor = await requireAdmin();
  const items = await listNotifications(actor.adminId);
  const taskOf = (link: string | null) => /#task-([0-9a-f-]{36})$/.exec(link ?? "")?.[1] ?? null;
  const states = await taskStates(items.map((n) => taskOf(n.link)).filter((x): x is string => !!x));
  const unread = items.filter((n) => !n.readAt).length;
  return (
    <>
      <StudioHead
        title="Inbox"
        sub={
          actor.role === "admin"
            ? "To-dos, new kits, Studio sign-ins and security risks."
            : "To-dos given to you or finished for you, and new kits for curriculum."
        }
      >
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button className="btn btn-sm">
              <Icon name="check" size={15} /> Mark all as read
            </button>
          </form>
        )}
        {items.length > unread && (
          <form action={clearReadAction}>
            <button className="btn btn-sm btn-outline">Clear read</button>
          </form>
        )}
      </StudioHead>

      {!items.length ? (
        <div className="st-card st-empty">
          <Icon name="inbox" size={26} />
          <p>You&apos;re all caught up.</p>
        </div>
      ) : (
        <ul className="st-inbox">
          {items.map((n) => {
            const k = KIND[n.kind] ?? { icon: "bell", label: "Notice" };
            const task = states.get(taskOf(n.link) ?? "");
            return (
              <li key={n.id}>
                <form action={openNotificationAction}>
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="link" value={n.link ?? ""} />
                  <button className={`st-inboxItem ${n.readAt ? "" : "st-inboxUnread"}`} data-kind={n.kind}>
                    <span className="st-inboxIcon" aria-hidden="true">
                      <Icon name={k.icon} size={18} />
                    </span>
                    <span className="st-inboxText">
                      <span className="st-inboxTitle">
                        {!n.readAt && <span className="sr-only">Unread: </span>}
                        {n.title}
                      </span>
                      {n.body && <span className="st-inboxBody">{n.body}</span>}
                      {task && (
                        <span className="st-inboxBody">
                          {task.status === "done" ? (
                            "Done"
                          ) : (
                            <>
                              Due <LocalTime iso={task.dueAt.toISOString()} />
                            </>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="st-inboxMeta">
                      <span className="st-pill st-pill-muted">{k.label}</span>
                      <span className="hint">
                        <LocalTime iso={n.createdAt.toISOString()} />
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

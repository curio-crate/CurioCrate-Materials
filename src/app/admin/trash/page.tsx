import { Icon } from "@/components/ui/Icon";
import { requireAdmin } from "@/lib/auth/viewer";
import { TRASH_DAYS } from "@/lib/team/chat";
import { listTrash, purgeExpiredTrash } from "@/lib/team/trash";
import { ConfirmSubmit } from "../Confirm";
import { LocalTime } from "../LocalTime";
import { Notice } from "../Notice";
import { StudioHead } from "../StudioHead";
import { purgeAction, restoreAction } from "./actions";

export const metadata = { title: "Recently deleted" };

export default async function TrashPage(props: PageProps<"/admin/trash">) {
  await requireAdmin("trash");
  const sp = await props.searchParams;
  await purgeExpiredTrash(); // anything past its 30 days is gone for good (the daily job does this too)
  const items = await listTrash();
  const now = new Date().getTime();
  return (
    <>
      <Notice sp={sp} />
      <StudioHead title="Recently deleted" sub={`Lessons, materials, files and chat messages anyone deleted. Restore them, or delete them for good. After ${TRASH_DAYS} days they are deleted automatically.`} />
      {!items.length ? (
        <div className="st-card st-empty">
          <Icon name="trash" size={26} />
          <p>Nothing has been deleted in the last {TRASH_DAYS} days.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Deleted</th>
                <th scope="col">Deleted for good</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => {
                const days = Math.max(0, Math.ceil((t.purgeAfter.getTime() - now) / 86400_000));
                return (
                  <tr key={t.id}>
                    <td>
                      <span className="st-trashItem">
                        <span className="st-rowIcon" aria-hidden="true">
                          <Icon name={t.kind === "message" ? "chat" : "pdf"} size={17} />
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <strong style={{ color: "var(--st-heading)", display: "block" }}>{t.title}</strong>
                          <span className="hint">{t.detail}</span>
                        </span>
                      </span>
                    </td>
                    <td className="hint">
                      <LocalTime iso={t.deletedAt.toISOString()} />
                      <br />
                      by {t.deletedByName}
                    </td>
                    <td>
                      <span className={`st-pill ${days <= 3 ? "st-pill-warn" : "st-pill-muted"}`}>{days === 0 ? "Today" : `In ${days} day${days === 1 ? "" : "s"}`}</span>
                    </td>
                    <td>
                      <div className="st-trashActions">
                        <form action={restoreAction}>
                          <input type="hidden" name="id" value={t.id} />
                          <button className="btn btn-xs" aria-label={`Restore ${t.title}`}>
                            <Icon name="undo" size={14} /> Restore
                          </button>
                        </form>
                        <form action={purgeAction}>
                          <input type="hidden" name="id" value={t.id} />
                          <ConfirmSubmit
                            className="btn btn-xs btn-danger"
                            aria-label={`Delete for good: ${t.title}`}
                            title={`Delete “${t.title}” for good?`}
                            message="This can't be undone. Its files are removed from storage."
                            confirmLabel="Delete for good"
                          >
                            Delete for good
                          </ConfirmSubmit>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

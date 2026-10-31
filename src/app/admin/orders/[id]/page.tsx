import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { formatCode } from "@/lib/codes";
import { getOrderWithCodes } from "@/lib/orders";
import { reissueAction, voidAction } from "../../actions";
import styles from "../../admin.module.css";
import { Notice } from "../../Notice";

export const metadata = { title: "Order" };

export default async function OrderPage(props: PageProps<"/admin/orders/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const data = await getOrderWithCodes(id);
  if (!data) notFound();
  const { order, codes, org } = data;
  const redeemed = codes.filter((c) => c.code.status === "redeemed").length;
  const backTo = `/admin/orders/${id}`;

  return (
    <>
      <Notice sp={sp} />
      <div className={styles.grid2}>
        <div>
          <span className="eyebrow">Order · {order.source.replace("_", " ")}</span>
          <h1 className={`h2 ${styles.title}`}>{order.reference ?? `Order ${order.id.slice(0, 8)}`}</h1>
        </div>
        <div className={styles.inline} style={{ justifyContent: "flex-end" }}>
          <Link href={`/admin/orders/${id}/print`} className="btn btn-outline btn-sm">
            <Icon name="print" size={15} /> Print code sheet
          </Link>
          <a href={`/admin/orders/${id}/codes.csv`} className="btn btn-sm">
            <Icon name="download" size={15} /> CSV
          </a>
        </div>
      </div>
      <div className={`card ${styles.panel}`}>
        <dl className={styles.kv}>
          <dt>Customer</dt>
          <dd>
            {order.customerName ?? "—"} {order.customerEmail ? `· ${order.customerEmail}` : ""}
          </dd>
          <dt>School</dt>
          <dd>{org ? <Link className="link" href={`/admin/schools/${org.id}`}>{org.name}</Link> : "Not assigned (codes go to whichever school redeems them)"}</dd>
          <dt>Codes</dt>
          <dd>
            {codes.length} issued · {redeemed} redeemed
          </dd>
          <dt>Created</dt>
          <dd>{order.createdAt.toLocaleString()}</dd>
          {order.notes && (
            <>
              <dt>Notes</dt>
              <dd>{order.notes}</dd>
            </>
          )}
        </dl>
      </div>

      <section className={styles.section} aria-labelledby="codes-title">
        <h2 id="codes-title" className="h3">
          Codes
        </h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Kit</th>
                <th scope="col">Status</th>
                <th scope="col">School</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map(({ code, kitName, orgName }) => (
                <tr key={code.id}>
                  <td className={styles.mono} data-testid="order-code">
                    {formatCode(code.code)}
                  </td>
                  <td>{kitName}</td>
                  <td className={styles[`status_${code.status}`]}>{code.status}</td>
                  <td>{orgName ?? "—"}</td>
                  <td>
                    {code.status === "active" ? (
                      <div className={styles.inline}>
                        <form action={reissueAction}>
                          <input type="hidden" name="codeId" value={code.id} />
                          <input type="hidden" name="back" value={backTo} />
                          <input type="hidden" name="reason" value="reissued from order page" />
                          <button className="btn btn-xs btn-outline">Reissue</button>
                        </form>
                        <form action={voidAction}>
                          <input type="hidden" name="codeId" value={code.id} />
                          <input type="hidden" name="back" value={backTo} />
                          <button className="btn btn-xs btn-danger">Void</button>
                        </form>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

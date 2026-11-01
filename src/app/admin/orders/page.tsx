import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { listAllKits } from "@/lib/content";
import { recentOrders } from "@/lib/orders";
import { createOrderAction } from "../actions";
import styles from "../admin.module.css";
import { Notice } from "../Notice";
import { requireAdmin } from "@/lib/auth/viewer";

export const metadata = { title: "Orders" };

const SOURCES = [
  { value: "purchase_order", label: "District purchase order" },
  { value: "distributor", label: "Distributor" },
  { value: "card", label: "Card payment (manual entry)" },
  { value: "manual", label: "Manual / replacement / donation" },
];

export default async function OrdersPage(props: PageProps<"/admin/orders">) {
  await requireAdmin("codes");
  const sp = await props.searchParams;
  const [orders, kits] = await Promise.all([recentOrders(30), listAllKits()]);
  return (
    <>
      <Notice sp={sp} />
      <div className={styles.grid2}>
        <section aria-labelledby="recent-orders">
          <h1 id="recent-orders" className={`h2 ${styles.title}`}>
            Orders
          </h1>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Created</th>
                  <th scope="col">Source</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Customer / school</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(({ order, orgName }) => (
                  <tr key={order.id}>
                    <td>{order.createdAt.toLocaleDateString()}</td>
                    <td>{order.source.replace("_", " ")}</td>
                    <td>
                      <Link className="link" href={`/admin/orders/${order.id}`}>
                        {order.reference ?? "View codes"}
                      </Link>
                    </td>
                    <td>{order.customerName ?? orgName ?? "—"}</td>
                  </tr>
                ))}
                {!orders.length && (
                  <tr>
                    <td colSpan={4} className={styles.empty}>
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className={`card ${styles.panel}`} aria-labelledby="new-order">
          <h2 id="new-order" className="h3">
            New order
          </h2>
          <p className="hint">Generates one single-use code per kit. Print the sheet for the boxes or send the CSV to the distributor.</p>
          <form action={createOrderAction} className={styles.form}>
            <div className="field">
              <label className="label" htmlFor="source">
                Source
              </label>
              <select id="source" name="source" className="select" defaultValue="purchase_order">
                {SOURCES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="reference">
                PO / invoice / reference number
              </label>
              <input id="reference" name="reference" className="input" placeholder="PO-2026-114" />
              <p className="hint">Re-submitting the same source and reference shows the existing order instead of making duplicate codes.</p>
            </div>
            <div className={styles.formRow}>
              <div className="field">
                <label className="label" htmlFor="customerName">
                  Customer name
                </label>
                <input id="customerName" name="customerName" className="input" />
              </div>
              <div className="field">
                <label className="label" htmlFor="customerEmail">
                  Customer email
                </label>
                <input id="customerEmail" name="customerEmail" type="email" className="input" />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="school">
                School join code (optional)
              </label>
              <input id="school" name="school" className="input" placeholder="ABCDEF" />
            </div>
            <fieldset className={styles.form}>
              <legend className="label">Kits and quantities</legend>
              {kits.map((k) => (
                <div key={k.id} className={styles.qtyRow}>
                  <label htmlFor={`qty_${k.id}`}>{k.name}</label>
                  <input id={`qty_${k.id}`} name={`qty_${k.id}`} type="number" min={0} max={5000} defaultValue={0} className="input" inputMode="numeric" />
                </div>
              ))}
            </fieldset>
            <div className="field">
              <label className="label" htmlFor="notes">
                Notes
              </label>
              <textarea id="notes" name="notes" className="textarea" />
            </div>
            <SubmitButton className="btn btn-solid" pendingText="Generating codes…">
              Create order and codes
            </SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}

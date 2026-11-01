"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { formatCents, parseDollars, partsTotal, type Part } from "@/lib/kit-parts";
import { saveKitPartsAction } from "./actions";

type Row = { key: number; name: string; quantity: string; price: string; supplier: string };

const toRow = (p: Part, key: number): Row => ({ key, name: p.name, quantity: String(p.quantity), price: p.unitCostCents == null ? "" : (p.unitCostCents / 100).toFixed(2), supplier: p.supplier ?? "" });
const toPart = (r: Row): Part => ({ name: r.name.trim(), quantity: Math.max(1, Math.round(Number(r.quantity) || 1)), unitCostCents: parseDollars(r.price), supplier: r.supplier.trim() || null });

// A physical kit's parts and components: one editable table, totalled live, saved in one go. Teachers see the part
// names as "In the box"; prices and suppliers stay in Studio (the Kits directory shows them as the pricing catalog).
export function PartsEditor({ kitId, initial }: { kitId: string; initial: Part[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => initial.map(toRow));
  const [next, setNext] = useState(initial.length);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const patch = (key: number, p: Partial<Row>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
    setDirty(true);
    setMsg(null);
  };
  const add = () => {
    setRows((rs) => [...rs, { key: next, name: "", quantity: "1", price: "", supplier: "" }]);
    setNext((n) => n + 1);
    setDirty(true);
    requestAnimationFrame(() => document.getElementById(`part-name-${next}`)?.focus());
  };
  const remove = (key: number) => {
    setRows((rs) => rs.filter((r) => r.key !== key));
    setDirty(true);
  };

  const named = rows.filter((r) => r.name.trim()).map(toPart);
  const total = partsTotal(named);

  const save = async () => {
    setBusy(true);
    const r = await saveKitPartsAction(kitId, named);
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error });
    setDirty(false);
    setMsg({ ok: true, text: `Saved ${r.count} part${r.count === 1 ? "" : "s"}. The pricing catalog is up to date.` });
    router.refresh();
  };

  return (
    <div className="st-step">
      <div className="table-wrap">
        <table className="table st-parts">
          <caption className="sr-only">Parts and components</caption>
          <thead>
            <tr>
              <th scope="col">Part or component</th>
              <th scope="col" style={{ width: 90 }}>
                Qty per kit
              </th>
              <th scope="col" style={{ width: 130 }}>
                Unit price (USD)
              </th>
              <th scope="col" className="st-num" style={{ width: 110 }}>
                Line total
              </th>
              <th scope="col">Supplier or SKU</th>
              <th scope="col" style={{ width: 44 }}>
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const p = toPart(r);
              return (
                <tr key={r.key}>
                  <td>
                    <input id={`part-name-${r.key}`} className="input" aria-label={`Part ${i + 1} name`} value={r.name} placeholder="Pipette, 3 mL" onChange={(e) => patch(r.key, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="input" aria-label={`Part ${i + 1} quantity`} type="number" min={1} value={r.quantity} onChange={(e) => patch(r.key, { quantity: e.target.value })} />
                  </td>
                  <td>
                    <input className="input" aria-label={`Part ${i + 1} unit price`} inputMode="decimal" value={r.price} placeholder="0.00" onChange={(e) => patch(r.key, { price: e.target.value })} />
                  </td>
                  <td className="st-num">{p.unitCostCents == null ? "—" : formatCents(p.unitCostCents * p.quantity)}</td>
                  <td>
                    <input className="input" aria-label={`Part ${i + 1} supplier`} value={r.supplier} placeholder="Supplier, SKU or link" onChange={(e) => patch(r.key, { supplier: e.target.value })} />
                  </td>
                  <td>
                    <button type="button" className="st-close" aria-label={`Remove ${r.name || `part ${i + 1}`}`} onClick={() => remove(r.key)} disabled={busy}>
                      <Icon name="x" size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="st-empty" style={{ padding: 28 }}>
                  No parts yet. Add every component that goes in the box.
                </td>
              </tr>
            )}
          </tbody>
          {!!named.length && (
            <tfoot>
              <tr>
                <td colSpan={3}>
                  Cost per kit · {named.length} part{named.length === 1 ? "" : "s"}
                  {total.unpriced > 0 && <span className="hint"> ({total.unpriced} without a price)</span>}
                </td>
                <td className="st-num">{formatCents(total.cents)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <button type="button" className="st-add" onClick={add} disabled={busy}>
          <Icon name="plus" size={14} /> Add a part
        </button>
        <button type="button" className="btn btn-solid btn-sm" onClick={save} disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save parts"}
        </button>
        <span role="status" className={msg && !msg.ok ? "alert alert-danger" : "hint"} style={msg && !msg.ok ? { padding: "6px 10px" } : undefined}>
          {msg?.text ?? (dirty ? "Unsaved changes" : "")}
        </span>
      </div>
    </div>
  );
}

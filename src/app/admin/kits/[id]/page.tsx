import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireAdmin } from "@/lib/auth/viewer";
import { asKitKind, costText, formatCents, isDraftKit, KIT_KIND, partsTotal } from "@/lib/kit-parts";
import { getStudioKit, kitProfile } from "@/lib/kit-studio";
import { Activities } from "../../files/Activities";
import { Notice } from "../../Notice";
import { StudioHead } from "../../StudioHead";
import { saveKitIdentityAction } from "../actions";

export const metadata = { title: "Kit" };

// A kit in the Kits directory: what it is, where it stands, and its storage: the parts & pricing catalog of a
// physical kit (built from the parts Curriculum lists) or the HTML5 / JavaScript activities of an online kit.
export default async function KitPage(props: PageProps<"/admin/kits/[id]">) {
  await requireAdmin("kits");
  const { id } = await props.params;
  const sp = await props.searchParams;
  const kit = await getStudioKit(id);
  if (!kit) notFound();
  const kind = asKitKind(kit.kind);
  const draft = isDraftKit(kit);
  const p = await kitProfile(kit.id);
  const total = partsTotal(p.parts);

  return (
    <>
      <Link href="/admin/kits" className="st-back">
        <Icon name="chevron" size={14} /> Kits
      </Link>
      <Notice sp={sp} />
      <StudioHead title={kit.name} sub={`${KIT_KIND[kind].label} · code prefix ${kit.code} · ${kit.gradeBand}${kit.tagline ? ` · ${kit.tagline}` : ""}`}>
        <span className={`st-pill ${draft ? "st-pill-warn" : "st-pill-ok"}`}>{draft ? "Draft · in curriculum" : "Published"}</span>
        <Link className="btn btn-sm" href={`/admin/files/${kit.id}`}>
          Open in Materials library
        </Link>
      </StudioHead>

      <div className="st-grid" style={{ marginBottom: 28 }}>
        <div className="st-tile">
          <span className="st-tileTitle">Lessons</span>
          <span className="st-tileNum">{p.lessons.length}</span>
        </div>
        <div className="st-tile">
          <span className="st-tileTitle">Manuals & files</span>
          <span className="st-tileNum">{p.files.length}</span>
        </div>
        {kind === "physical" ? (
          <div className="st-tile">
            <span className="st-tileTitle">Cost per kit</span>
            <span className="st-tileNum">{costText(total, p.parts.length)}</span>
          </div>
        ) : (
          <div className="st-tile">
            <span className="st-tileTitle">HTML5 / JS activities</span>
            <span className="st-tileNum">{p.activities.length}</span>
          </div>
        )}
      </div>

      {kind === "physical" ? (
        <section aria-labelledby="catalog-h">
          <div className="st-sectionHead">
            <h2 id="catalog-h" className="st-h2">
              Parts & pricing catalog
            </h2>
            <span className="row" style={{ gap: 12 }}>
              {!!p.parts.length && (
                <a className="text-link" href={`/admin/kits/${kit.id}/parts.csv`}>
                  Download CSV
                </a>
              )}
              <Link className="text-link" href={`/admin/files/${kit.id}?tab=parts`}>
                Edit parts
              </Link>
            </span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Parts and pricing for {kit.name}</caption>
              <thead>
                <tr>
                  <th scope="col">Part or component</th>
                  <th scope="col" className="st-num">
                    Qty per kit
                  </th>
                  <th scope="col" className="st-num">
                    Unit price
                  </th>
                  <th scope="col" className="st-num">
                    Line total
                  </th>
                  <th scope="col">Supplier or SKU</th>
                </tr>
              </thead>
              <tbody>
                {p.parts.map((x) => (
                  <tr key={x.id}>
                    <td>{x.name}</td>
                    <td className="st-num">{x.quantity}</td>
                    <td className="st-num">{formatCents(x.unitCostCents)}</td>
                    <td className="st-num">{x.unitCostCents == null ? "—" : formatCents(x.unitCostCents * x.quantity)}</td>
                    <td className="hint">{x.supplier ?? "—"}</td>
                  </tr>
                ))}
                {!p.parts.length && (
                  <tr>
                    <td colSpan={5} className="st-empty" style={{ padding: 28 }}>
                      No parts yet. Curriculum lists them in the Materials library (Parts & components), and they appear here with their prices.
                    </td>
                  </tr>
                )}
              </tbody>
              {!!p.parts.length && (
                <tfoot>
                  <tr>
                    <td colSpan={3}>
                      <strong>Cost per kit</strong>
                      {total.unpriced > 0 && <span className="hint"> · {total.unpriced} part{total.unpriced === 1 ? "" : "s"} without a price</span>}
                    </td>
                    <td className="st-num">
                      <strong>{formatCents(total.cents)}</strong>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      ) : (
        <section aria-labelledby="assets-h">
          <div className="st-sectionHead">
            <h2 id="assets-h" className="st-h2">
              HTML5 / JavaScript activities
            </h2>
          </div>
          <Activities kit={kit} activities={p.activities} lessons={p.lessons.map((l) => ({ id: l.id, title: l.title, kitId: l.kitId }))} />
        </section>
      )}

      <details className="st-details" style={{ marginTop: 32 }}>
        <summary>
          <Icon name="chevron" size={14} /> Edit name, one-line description and card style
        </summary>
        <form action={saveKitIdentityAction} className="st-card st-step" style={{ maxWidth: 760 }}>
          <input type="hidden" name="id" value={kit.id} />
          <div className="st-fields">
            <div className="field">
              <label className="label" htmlFor="name">
                Kit name
              </label>
              <input id="name" name="name" className="input" required minLength={3} defaultValue={kit.name} />
            </div>
            <div className="field">
              <label className="label" htmlFor="accent">
                Card style
              </label>
              <select id="accent" name="accent" className="select" defaultValue={kit.accent}>
                <option value="lum">Teal glow</option>
                <option value="gold">Gold</option>
                <option value="blue">Night blue</option>
              </select>
            </div>
            <div className="field st-span2">
              <label className="label" htmlFor="tagline">
                What it is, in one line
              </label>
              <input id="tagline" name="tagline" className="input" defaultValue={kit.tagline} />
            </div>
          </div>
          <div>
            <SubmitButton className="btn btn-solid">Save</SubmitButton>
          </div>
        </form>
      </details>
    </>
  );
}

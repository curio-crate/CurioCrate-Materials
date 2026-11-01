import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireAdmin } from "@/lib/auth/viewer";
import { KIT_KIND, KIT_KINDS } from "@/lib/kit-parts";
import { Notice } from "../../Notice";
import { StudioHead } from "../../StudioHead";
import { createKitAction } from "../actions";

export const metadata = { title: "New kit" };

// Step one of a kit: what kind it is and what it is. Everything else (description, NGSS, manuals, lessons, parts)
// is built by Curriculum in the Materials library, where the kit appears as a draft as soon as it is created.
export default async function NewKit(props: PageProps<"/admin/kits/new">) {
  await requireAdmin("kits");
  const sp = await props.searchParams;
  const v = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  return (
    <>
      <Link href="/admin/kits" className="st-back">
        <Icon name="chevron" size={14} /> Kits
      </Link>
      <Notice sp={sp} />
      <StudioHead title="New kit" sub="Say what it is. It goes straight to the curriculum team as a draft; teachers see it only after Curriculum publishes it." />
      <form action={createKitAction} className="st-card st-step" style={{ maxWidth: 760 }}>
        <fieldset className="st-step" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="st-stepTitle" style={{ marginBottom: 10 }}>
            Kit type
          </legend>
          <div className="st-choices">
            {KIT_KINDS.map((k) => (
              <label key={k} className="st-role">
                <input type="radio" name="kind" value={k} required defaultChecked={v("kind") === k} />
                <span className="st-tileIcon" aria-hidden="true">
                  <Icon name={KIT_KIND[k].icon} size={18} />
                </span>
                <span>
                  <span className="st-roleName" style={{ display: "block" }}>
                    {k === "online" ? "Online" : "Physical"}
                  </span>
                  <span className="st-roleText">{KIT_KIND[k].blurb}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="st-fields">
          <div className="field">
            <label className="label" htmlFor="name">
              Kit name
            </label>
            <input id="name" name="name" className="input" required minLength={3} defaultValue={v("name")} placeholder="Magnet Lab Kit" />
          </div>
          <div className="field">
            <label className="label" htmlFor="code">
              Code prefix (3 characters, printed on codes)
            </label>
            <input id="code" name="code" className="input" required maxLength={3} pattern="[A-Za-z0-9]{3}" defaultValue={v("code")} placeholder="MAG" />
          </div>
          <div className="field st-span2">
            <label className="label" htmlFor="tagline">
              What it is, in one line
            </label>
            <input id="tagline" name="tagline" className="input" defaultValue={v("tagline")} placeholder="Students map magnetic fields with real magnets and compasses." />
          </div>
          <div className="field">
            <label className="label" htmlFor="gradeMin">
              Lowest grade
            </label>
            <input id="gradeMin" name="gradeMin" type="number" min={1} max={12} className="input" defaultValue={6} />
          </div>
          <div className="field">
            <label className="label" htmlFor="gradeMax">
              Highest grade
            </label>
            <input id="gradeMax" name="gradeMax" type="number" min={1} max={12} className="input" defaultValue={8} />
          </div>
        </div>
        <div>
          <SubmitButton className="btn btn-solid">Create kit</SubmitButton>
        </div>
      </form>
    </>
  );
}

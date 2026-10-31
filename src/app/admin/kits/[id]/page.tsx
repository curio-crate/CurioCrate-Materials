import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { db } from "@/db";
import { kits } from "@/db/schema";
import { saveKitAction } from "../../content/actions";
import styles from "../../admin.module.css";
import { Notice } from "../../Notice";

export const metadata = { title: "Kit" };

export default async function KitEditor(props: PageProps<"/admin/kits/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const d = await db();
  const kit = id === "new" ? null : (await d.select().from(kits).where(eq(kits.id, id)))[0];
  if (id !== "new" && !kit) notFound();
  const f = (label: string, name: string, value: string | number | undefined, props: Record<string, unknown> = {}) => (
    <div className="field">
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="input" defaultValue={value} {...props} />
    </div>
  );
  return (
    <>
      <Notice sp={sp} />
      <h1 className={`h2 ${styles.title}`}>{kit ? kit.name : "New kit"}</h1>
      <form action={saveKitAction} className={`card ${styles.panel} ${styles.form}`} style={{ maxWidth: 820 }}>
        <input type="hidden" name="id" value={kit?.id ?? ""} />
        <div className={styles.formRow}>
          {f("Kit name", "name", kit?.name, { required: true, placeholder: "Magnet Lab Kit" })}
          {f("Code prefix (3 characters, printed on codes)", "code", kit?.code, { required: true, maxLength: 3, placeholder: "MAG", readOnly: !!kit })}
        </div>
        <div className={styles.formRow}>
          {f("Lowest grade", "gradeMin", kit?.gradeMin, { type: "number", min: 4, max: 10 })}
          {f("Highest grade", "gradeMax", kit?.gradeMax, { type: "number", min: 4, max: 10 })}
        </div>
        {f("Tagline", "tagline", kit?.tagline)}
        <div className="field">
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" className="textarea" defaultValue={kit?.description} />
        </div>
        <div className={styles.formRow}>
          <div className="field">
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" className="select" defaultValue={kit?.status ?? "available"}>
              <option value="available">Available</option>
              <option value="in_development">In development</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="accent">Card style</label>
            <select id="accent" name="accent" className="select" defaultValue={kit?.accent ?? "blue"}>
              <option value="lum">Teal glow</option>
              <option value="gold">Gold</option>
              <option value="blue">Night blue</option>
            </select>
          </div>
        </div>
        {f("NGSS codes (comma separated)", "ngss", kit?.ngss.join(", "))}
        {f("What students learn (comma separated)", "skills", kit?.skills.join(", "))}
        {f("In the box (comma separated)", "inTheBox", kit?.inTheBox.join(", "))}
        <SubmitButton className="btn btn-solid">{kit ? "Save kit" : "Create kit"}</SubmitButton>
      </form>
    </>
  );
}

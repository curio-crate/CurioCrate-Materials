import type { Metadata } from "next";
import { redirect } from "next/navigation";
import adminStyles from "@/app/admin/admin.module.css";
import { PageHead } from "@/components/ui/PageHead";
import { requireTeacher } from "@/lib/auth/viewer";
import { districtReport } from "@/lib/district";

export const metadata: Metadata = { title: "District dashboard" };

export default async function DistrictPage() {
  const v = await requireTeacher("/district");
  if (!v.isDistrictAdmin || !v.district) redirect("/dashboard");
  const { schools, totals } = await districtReport(v.district.id);
  return (
    <div className="container-wide">
      <PageHead eyebrow="District dashboard" size="h1" title={v.district.name} lead="Usage across your schools. Student numbers count anonymous class-code devices; no student is identified." />
      <dl className={adminStyles.stats}>
        {[["Schools", schools.length], ["Teachers", totals.teachers], ["Student devices", totals.students], ["Video minutes", totals.minutes], ["Lessons opened", totals.views]].map(([k, n]) => (
          <div key={k} className={adminStyles.stat}><dt>{k}</dt><dd>{n}</dd></div>
        ))}
      </dl>
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Usage by school</caption>
          <thead><tr><th scope="col">School</th><th scope="col">Kits</th><th scope="col">Teachers</th><th scope="col">Student devices</th><th scope="col">Video minutes</th><th scope="col">Lessons opened</th><th scope="col">Curie.AI messages</th></tr></thead>
          <tbody>
            {schools.map((r) => (
              <tr key={r.school.id}><th scope="row">{r.school.name}</th><td>{r.kits.join(", ") || "—"}</td><td>{r.teachers}</td><td>{r.students}</td><td>{r.minutes}</td><td>{r.views}</td><td>{r.curie}</td></tr>
            ))}
            {!schools.length && <tr><td colSpan={7} className={adminStyles.empty}>No schools are linked to this district yet. Contact support to link them.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

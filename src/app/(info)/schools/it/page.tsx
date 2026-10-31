import type { Metadata } from "next";
import { PageHead } from "@/components/ui/PageHead";
import { ALLOWED_DOMAINS } from "@/lib/domains";
import { serviceModes } from "@/lib/env";
import styles from "../../info.module.css";

export const metadata: Metadata = { title: "IT & web filters", description: "Every domain Curiocrate Materials uses, for school web-filter allow-lists." };

export default function ItPage() {
  const modes = serviceModes();
  return (
    <div className="container">
      <PageHead eyebrow="For school IT" title="Domains to allow" accent="through your web filter." lead="Allow these domains so lessons, videos and sign-in work on student Chromebooks. The site's Content-Security-Policy is built from this same list, so it is always complete." />
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">Domains used by materials.curiocrate.org</caption>
          <thead>
            <tr>
              <th scope="col">Domain</th>
              <th scope="col">Used for</th>
              <th scope="col">Needed</th>
            </tr>
          </thead>
          <tbody>
            {ALLOWED_DOMAINS.map((d) => (
              <tr key={d.domain}>
                <td className={styles.mono}>{d.domain}</td>
                <td>{d.purpose}</td>
                <td>{d.required === "always" ? "Always" : "Only if your school uses it"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${styles.grid} ${styles.section}`}>
        <section className={`card ${styles.block}`} aria-labelledby="devices">
          <span className="eyebrow">Devices</span>
          <h2 id="devices" className="h3">
            Built for low-end Chromebooks
          </h2>
          <ul className={styles.list}>
            <li>Tested at 1366×768 with a throttled CPU and a slow network.</li>
            <li>Video streams in 720p or 360p and switches automatically; teachers can lock it to low quality.</li>
            <li>Every video has a low-resolution download for classrooms without reliable Wi-Fi.</li>
            <li>No browser plug-ins, no installs.</li>
          </ul>
        </section>
        <section className={`card ${styles.block}`} aria-labelledby="status">
          <span className="eyebrow">Service status</span>
          <h2 id="status" className="h3">
            Connected services
          </h2>
          <ul className={styles.list}>
            {modes.map((m) => (
              <li key={m.service}>
                <strong>{m.service}:</strong> <span className={styles[`mode_${m.mode}`]}>{m.mode}</span> · {m.detail}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

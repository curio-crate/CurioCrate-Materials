import type { Metadata } from "next";
import { ContentRow } from "@/components/content/ContentBits";
import listStyles from "@/components/content/content.module.css";
import { PageHead } from "@/components/ui/PageHead";
import { contentHref, listAllContent, listKits } from "@/lib/content";
import { viewerAccess } from "@/lib/viewer-grants";
import styles from "../info.module.css";

export const metadata: Metadata = { title: "Teacher training", description: "Short professional-learning courses for every Curiocrate kit." };

export default async function TrainingPage() {
  const [all, kits, access] = await Promise.all([listAllContent(), listKits(), viewerAccess()]);
  const training = all.filter((c) => c.type === "training");
  const general = training.filter((c) => !c.kitId);
  const byKit = kits.map((k) => ({ kit: k, items: training.filter((c) => c.kitId === k.id) })).filter((g) => g.items.length);
  return (
    <div className="container">
      <PageHead eyebrow="Professional learning" title="Teacher training," accent="in under thirty minutes." lead="Short courses on running each kit, the misconceptions students bring, and teaching with Curie.AI. Included with every subscription." />
      <section aria-labelledby="general">
        <h2 id="general" className="h3" style={{ marginBottom: 18 }}>
          For every classroom
        </h2>
        <ul className={listStyles.list}>
          {general.map((c) => (
            <ContentRow key={c.id} item={c} href={contentHref(c)} state={access.state(c)} kitName="Professional learning" />
          ))}
        </ul>
      </section>
      {byKit.map(({ kit, items }) => (
        <section key={kit.id} className={styles.section} aria-labelledby={`t-${kit.slug}`}>
          <h2 id={`t-${kit.slug}`} className="h3">
            {kit.name}
          </h2>
          <ul className={listStyles.list}>
            {items.map((c) => (
              <ContentRow key={c.id} item={c} href={contentHref(c)} state={access.state(c)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

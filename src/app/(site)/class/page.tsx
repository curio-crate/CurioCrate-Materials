import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui/PageHead";
import { assignments, currentStudent } from "@/lib/classes";
import { contentHref, listKits } from "@/lib/content";
import { features } from "@/lib/features";
import { CurieChat } from "@/components/curie/CurieChat";
import { ContentList, ContentRow } from "@/components/content/ContentBits";

export const metadata: Metadata = { title: "My class" };

export default async function StudentClass() {
  const st = await currentStudent();
  if (!st) redirect("/join");
  const [items, kits] = await Promise.all([assignments(st.c.id), listKits()]);
  const kitOf = new Map(kits.map((k) => [k.id, k]));
  return (
    <div className="container">
      <PageHead eyebrow={`Hi, ${st.s.nickname}`} size="h1" title={st.c.name} lead={`Your teacher: ${st.teacher.name}. Open what's been assigned below.`} />
      {items.length ? (
        <ContentList>
          {items.map(({ item }) => {
            const kit = item.kitId ? kitOf.get(item.kitId) : undefined;
            return <ContentRow key={item.id} item={item} href={contentHref(item)} state="open" kitName={kit?.shortName} cap={kit?.accent} />;
          })}
        </ContentList>
      ) : (
        <div className="sx-empty">
          <strong>Nothing assigned yet.</strong>
          <span>When your teacher switches a lesson or lab on, it shows up here. You don&apos;t need to refresh.</span>
        </div>
      )}
      {features.curie && st.c.curieEnabled && (
        <section style={{ marginTop: 56 }} aria-labelledby="curie-h">
          <h2 id="curie-h" className="h3" style={{ marginBottom: 16 }}>
            Ask Curie
          </h2>
          <CurieChat lessons={items.filter(({ item }) => item.type !== "pdf").map(({ item }) => ({ slug: item.slug, title: item.title }))} />
        </section>
      )}
    </div>
  );
}

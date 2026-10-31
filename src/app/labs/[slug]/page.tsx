import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LockedPanel } from "@/components/content/ContentBits";
import { PageHead } from "@/components/ui/PageHead";
import { gateContent } from "@/lib/guard";
import { labBySlug } from "@/lib/labs";
import { LabRunner } from "./LabRunner";

export async function generateMetadata(props: PageProps<"/labs/[slug]">): Promise<Metadata> {
  const lab = labBySlug((await props.params).slug);
  return { title: lab?.title ?? "Lab" };
}

export default async function LabPage(props: PageProps<"/labs/[slug]">) {
  const { slug } = await props.params;
  const lab = labBySlug(slug);
  if (!lab) notFound();
  const gate = await gateContent(lab.contentSlug);
  return (
    <div className="container-wide">
      <PageHead eyebrow="Online lab" size="h1" title={lab.title} lead={lab.intro} />
      {gate.ok ? <LabRunner slug={lab.slug} /> : <LockedPanel reason={gate.reason === "sign_in" ? "sign_in" : "needs_kit"} next={`/labs/${slug}`} tier="free" />}
    </div>
  );
}

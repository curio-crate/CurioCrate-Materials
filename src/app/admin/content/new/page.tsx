import { lessonsForParentSelect } from "@/lib/cms";
import { listKits } from "@/lib/content";
import styles from "../../admin.module.css";
import { Notice } from "../../Notice";
import { ContentEditor } from "../ContentEditor";

export const metadata = { title: "New content" };

export default async function NewContent(props: PageProps<"/admin/content/new">) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const [kits, parents] = await Promise.all([listKits(), lessonsForParentSelect(null)]);
  return (
    <>
      <Notice sp={sp} />
      <h1 className={`h2 ${styles.title}`}>New content</h1>
      <ContentEditor item={null} kits={kits} parents={parents} resources={[]} defaults={{ type: str("type") || "instructions", kitId: str("kit"), parentId: str("parent") }} />
    </>
  );
}

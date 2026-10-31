import { notFound } from "next/navigation";
import { contentForEdit, lessonsForParentSelect } from "@/lib/cms";
import { listKits, TYPE_LABEL } from "@/lib/content";
import styles from "../../admin.module.css";
import { Notice } from "../../Notice";
import { ContentEditor } from "../ContentEditor";

export const metadata = { title: "Edit content" };

export default async function EditContent(props: PageProps<"/admin/content/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const data = await contentForEdit(id);
  if (!data) notFound();
  const [kits, parents] = await Promise.all([listKits(), lessonsForParentSelect(null)]);
  return (
    <>
      <Notice sp={sp} />
      <span className="eyebrow">{TYPE_LABEL[data.item.type]}</span>
      <h1 className={`h2 ${styles.title}`}>{data.item.title}</h1>
      <ContentEditor item={data.item} kits={kits} parents={parents} resources={data.children} defaults={{ type: data.item.type, kitId: "", parentId: "" }} />
    </>
  );
}

import { redirect } from "next/navigation";

// The public catalog was retired: teachers see their kits on the dashboard, students on their own pages.
export default function CatalogPage() {
  redirect("/dashboard");
}

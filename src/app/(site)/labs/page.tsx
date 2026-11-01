import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/viewer";

// No separate labs index: each lab lives on its kit (teachers) or in a class assignment (students).
export default async function LabsPage() {
  redirect((await getViewer()) ? "/dashboard" : "/demo");
}

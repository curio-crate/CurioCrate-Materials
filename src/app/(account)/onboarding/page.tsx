import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHead } from "@/components/ui/PageHead";
import { safeNext } from "@/lib/auth/flow";
import { requireTeacher } from "@/lib/auth/viewer";
import { emailDomain, isPublicEmailDomain } from "@/lib/teachers";
import styles from "../account.module.css";
import { OnboardingForms } from "./OnboardingForms";

export const metadata: Metadata = { title: "Your school" };

export default async function OnboardingPage(props: PageProps<"/onboarding">) {
  const sp = await props.searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : undefined);
  const v = await requireTeacher(`/onboarding?next=${encodeURIComponent(next)}`);
  if (v.org) redirect(next);
  const domain = emailDomain(v.teacher.email);
  return (
    <div className="container">
      <div className={styles.wide}>
        <PageHead
          center
          size="h1"
          eyebrow={`Welcome, ${v.teacher.name.split(" ")[0]}`}
          title="Which school"
          accent="do you teach at?"
          lead="Kit access belongs to your school, so every teacher there shares it. Join your school or set it up."
        />
        <OnboardingForms next={next} domain={isPublicEmailDomain(domain) ? null : domain} />
      </div>
    </div>
  );
}

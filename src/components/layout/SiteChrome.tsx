import type { ReactNode } from "react";
import "@/app/(site)/site.css";
import { getViewer } from "@/lib/auth/viewer";
import { currentStudent } from "@/lib/classes";
import { currentLearner } from "@/lib/students";
import { RevealObserver } from "./RevealObserver";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader, type HeaderViewer } from "./SiteHeader";

/** The teacher & student site's frame: header, page, footer. Studio (/admin) has its own frame and never uses this. */
export async function SiteChrome({ children }: { children: ReactNode }) {
  // Studio accounts are deliberately not reflected here: the site and Studio are separate products.
  const [teacher, learner, classStudent] = await Promise.all([getViewer(), currentLearner(), currentStudent()]);
  const viewer: HeaderViewer = teacher
    ? { kind: "teacher", name: teacher.teacher.name, isDistrictAdmin: teacher.isDistrictAdmin }
    : learner
      ? { kind: "learner", name: learner.nickname, inClass: !!classStudent }
      : classStudent
        ? { kind: "class", name: classStudent.s.nickname }
        : null;
  return (
    <div className="site">
      <SiteHeader viewer={viewer} />
      <main id="main" className="page" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
      <RevealObserver />
    </div>
  );
}

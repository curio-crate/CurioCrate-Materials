import type { Metadata } from "next";
import Link from "next/link";
import { usesDevPassword } from "@/lib/auth/admin";
import { requireAdmin } from "@/lib/auth/viewer";
import { serviceModes } from "@/lib/env";
import { AdminNav } from "./AdminNav";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Curiocrate Studio" }, robots: { index: false } };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const actor = await requireAdmin();
  const devPassword = await usesDevPassword(actor.adminId);
  const notCloud = serviceModes().filter((m) => m.mode !== "live").map((m) => m.service.split(" (")[0]);
  return (
    <div className="container-wide">
      <div className={styles.shell}>
        <header className={styles.head} data-print="hide">
          <div>
            <span className="eyebrow">Curiocrate Studio · company</span>
            <div className={styles.who}>
              Signed in as {actor.email}. Every change is recorded in the audit log.{" "}
              <form action="/api/company/logout" method="post" style={{ display: "inline" }}>
                <button className="text-link">Sign out</button>
              </form>
            </div>
          </div>
          <AdminNav />
        </header>
        {devPassword && (
          <p className="alert alert-warning" role="alert" data-print="hide">
            This account still uses the development password, which is written in the test code. <Link className="link" href="/admin/team">Change it now</Link>.
          </p>
        )}
        {!!notCloud.length && (
          <p className="alert alert-warning" role="status" data-print="hide">
            Not in the cloud yet: {notCloud.join(", ")}. Fine on this computer; the live site needs them. <Link className="link" href="/admin/team#sys-h">Details</Link>
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

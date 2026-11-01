import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { Icon } from "@/components/ui/Icon";
import { getCompanyAdmin } from "@/lib/auth/admin";
import { ROLE_LABEL, STUDIO_THEME_COOKIE, studioTheme } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/viewer";
import { unreadByChannel } from "@/lib/team/chat";
import { unreadNotificationCount } from "@/lib/team/notify";
import { myOpenTaskCount } from "@/lib/team/tasks";
import { Avatar } from "./Avatar";
import { ConfirmProvider } from "./Confirm";
import { StudioLive } from "./StudioLive";
import { StudioNav } from "./StudioNav";
import { ThemeToggle } from "./ThemeToggle";
import "./studio.css";

export const metadata: Metadata = { title: { default: "Studio", template: "%s · Curiocrate Studio" }, robots: { index: false } };

// Studio's own frame: a sidebar workspace, separate from the teacher site (no catalog, kits or redeem navigation).
// StudioLive keeps the Inbox / Chat / To-dos badges current; ConfirmProvider asks before every delete.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const actor = await requireAdmin();
  const [me, jar, inbox, chat, tasks] = await Promise.all([getCompanyAdmin(), cookies(), unreadNotificationCount(actor.adminId), unreadByChannel(actor.adminId), myOpenTaskCount(actor.adminId)]);
  const theme = studioTheme(jar.get(STUDIO_THEME_COOKIE)?.value);
  const name = me?.name ?? "Studio";
  return (
    <div className="studio" data-theme={theme}>
      <StudioLive initial={{ inbox, chat, tasks }}>
        <ConfirmProvider>
          <aside className="st-side" data-print="hide">
            <Link href="/admin" className="st-brand">
              <Image src="/brand/cclogosmall.png" alt="" width={30} height={30} unoptimized />
              <span>
                <span className="st-brandName">CurioCrate</span>
                <span className="st-brandTag">Studio</span>
              </span>
            </Link>
            <StudioNav role={me?.role ?? "director_curriculum"} />
            <div className="st-me">
              <Link href="/admin/account" className="st-meRow">
                <span className="sr-only">My account: </span>
                <Avatar person={{ id: actor.adminId, name, avatarKey: me?.avatarKey }} />
                <span style={{ minWidth: 0 }}>
                  <span className="st-meName" style={{ display: "block" }}>
                    {name}
                  </span>
                  <span className="st-pill st-pill-muted">{ROLE_LABEL[me?.role ?? "director_curriculum"]}</span>
                </span>
              </Link>
              <div className="st-meActions">
                <ThemeToggle initial={theme} />
                <form action="/api/company/logout" method="post" style={{ display: "contents" }}>
                  <button className="st-iconBtn">
                    <Icon name="logout" size={15} /> Sign out
                  </button>
                </form>
              </div>
            </div>
          </aside>
          <main id="main" className="st-main" tabIndex={-1}>
            <div className="st-content">{children}</div>
          </main>
        </ConfirmProvider>
      </StudioLive>
    </div>
  );
}

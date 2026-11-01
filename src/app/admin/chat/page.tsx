import { ROLE_LABEL } from "@/lib/auth/roles";
import { requireAdmin } from "@/lib/auth/viewer";
import { teamDirectory } from "@/lib/team/people";
import { canReadChannel } from "@/lib/team/shared";
import { ChatApp } from "./ChatApp";

export const metadata = { title: "Chat" };

// Studio chat: #Everyone, #Curriculum and #Production are open to every role (cross-department on purpose), plus
// private one-to-one conversations. Messages and files send instantly; the page polls for new ones.
export default async function ChatPage(props: PageProps<"/admin/chat">) {
  const actor = await requireAdmin();
  const sp = await props.searchParams;
  const people = await teamDirectory();
  const me = people.find((p) => p.id === actor.adminId);
  const asked = typeof sp.c === "string" ? sp.c : "all";
  return (
    <ChatApp
      me={{ id: actor.adminId, name: me?.name ?? actor.email, isAdmin: actor.role === "admin" }}
      people={people.filter((p) => p.id !== actor.adminId && p.active).map((p) => ({ id: p.id, name: p.name, role: ROLE_LABEL[p.role], avatarKey: p.avatarKey }))}
      everyone={people.map((p) => ({ id: p.id, name: p.name, avatarKey: p.avatarKey }))}
      initialChannel={canReadChannel(actor.adminId, asked) ? asked : "all"}
    />
  );
}

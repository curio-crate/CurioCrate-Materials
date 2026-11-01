// Studio team rules shared by the server and the browser (chat channels, avatars, chat files).

export const PUBLIC_CHANNELS = [
  { id: "all", label: "Everyone", hint: "The whole Studio team" },
  { id: "curriculum", label: "Curriculum", hint: "Curriculum department (open to everyone)" },
  { id: "production", label: "Production", hint: "Production department (open to everyone)" },
] as const;
export type PublicChannel = (typeof PUBLIC_CHANNELS)[number]["id"];

export const isPublicChannel = (c: string): c is PublicChannel => PUBLIC_CHANNELS.some((p) => p.id === c);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The private channel between two people: their ids in sorted order, so both sides name it the same. */
export function dmChannel(a: string, b: string) {
  return `dm:${[a, b].sort().join(":")}`;
}

/** The two people in a private channel, or null if it isn't one. */
export function dmMembers(channel: string): [string, string] | null {
  const m = /^dm:([0-9a-f-]{36}):([0-9a-f-]{36})$/i.exec(channel);
  return m && UUID.test(m[1]) && UUID.test(m[2]) && m[1] < m[2] ? [m[1], m[2]] : null;
}

/** Public channels are open to every Studio account; a private channel only to its two people. */
export function canReadChannel(adminId: string, channel: string) {
  if (isPublicChannel(channel)) return true;
  const m = dmMembers(channel);
  return !!m && m.includes(adminId);
}

/** Profile picture URL. `v` changes when the picture does, so browsers never show a stale one. */
export function avatarUrl(person: { id: string; avatarKey?: string | null }) {
  if (!person.avatarKey) return null;
  const v = /([0-9a-f]{8})[0-9a-f-]*\.\w+$/i.exec(person.avatarKey)?.[1] ?? "1";
  return `/api/admin/avatar/${person.id}?v=${v}`;
}

export const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

// ---------- Chat files ----------
export const CHAT_MAX_MB = 100;
export const CHAT_MAX_MESSAGE = 4000;
/** Shown inline in the conversation (checked by their first bytes). Everything else is a download. */
export const CHAT_IMAGE_EXT = ["png", "jpg", "jpeg", "gif", "webp"];
export const CHAT_FILE_EXT = [...CHAT_IMAGE_EXT, "pdf", "docx", "pptx", "xlsx", "doc", "ppt", "xls", "csv", "txt", "md", "zip", "mp4", "mov", "webm", "mp3", "m4a", "wav", "stl", "svg", "ai", "psd", "html", "js", "json"];
export const CHAT_ACCEPT = CHAT_FILE_EXT.map((e) => `.${e}`).join(",");

export const fileExt = (name: string) => /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? "";
export const chatFileAllowed = (name: string) => CHAT_FILE_EXT.includes(fileExt(name));

// ---------- Profile pictures ----------
export const AVATAR_MAX_MB = 2;
export const AVATAR_ACCEPT = ".png,.jpg,.jpeg,.webp";

// Teachers often go by a title ("Ms. Rivera"), so greeting them by the first word would say "Welcome back, Ms.".
const TITLE = /^(mr|mrs|ms|mx|miss|dr|prof|coach)\.?$/i;

/** The name to greet someone by: their first name, or title + surname when the name starts with a title. */
export function greetingName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (TITLE.test(parts[0]) && parts.length > 1) return `${parts[0]} ${parts[parts.length - 1]}`;
  return parts[0];
}

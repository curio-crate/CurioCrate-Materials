// Studio account tiers. Shared by the server (every page, action and upload route checks a permission) and the
// Studio sidebar (which only lists what the signed-in role can open).
//   admin       everything, including adding people and giving them a role
//   product     Product Officers: lessons and materials, kits, kit codes, schools and teacher access
//   curriculum  the curriculum only: lessons and their materials

export const STUDIO_ROLES = ["admin", "product", "curriculum"] as const;
export type StudioRole = (typeof STUDIO_ROLES)[number];

// "erase" = delete all of a school's data when its contract ends (admins only).
export type StudioPerm = "lessons" | "library" | "kits" | "codes" | "schools" | "teachers" | "security" | "usage" | "audit" | "team" | "erase";

const PERMS: Record<StudioRole, readonly StudioPerm[]> = {
  admin: ["lessons", "library", "kits", "codes", "schools", "teachers", "security", "usage", "audit", "team", "erase"],
  product: ["lessons", "library", "kits", "codes", "schools", "teachers"],
  curriculum: ["lessons"],
};

export const ROLE_LABEL: Record<StudioRole, string> = { admin: "Admin", product: "Product Officer", curriculum: "Curriculum" };

export const ROLE_BLURB: Record<StudioRole, string> = {
  admin: "Everything, including adding people and setting roles.",
  product: "Lessons and materials, kits, kit codes, schools and teacher access.",
  curriculum: "Lessons and their materials only.",
};

export const asRole = (v: unknown): StudioRole => (STUDIO_ROLES.includes(v as StudioRole) ? (v as StudioRole) : "curriculum");

export const can = (role: StudioRole, perm: StudioPerm) => PERMS[role].includes(perm);

/** Studio light/dark preference (read by the server so the page renders in the right theme). */
export const STUDIO_THEME_COOKIE = "cc_studio_theme";
export const studioTheme = (v: string | undefined): "light" | "dark" => (v === "dark" ? "dark" : "light");

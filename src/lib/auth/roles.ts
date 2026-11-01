// Studio account tiers. Shared by the server (every page, action and upload route checks a permission) and the
// Studio sidebar (which only lists what the signed-in role can open).
//   admin                everything, including adding people, roles and Recently deleted
//   head_production      Head of Production: everything a Product Officer does; gives to-dos
//   product              Product Officers: create kits (the kit directory, parts and pricing), kit codes, schools and
//                        teacher access, plus lessons and the materials library; receive to-dos
//   head_curriculum      Head of Curriculum: lessons and the materials library; gives to-dos
//   director_curriculum  Directors of Curriculum: lessons and the materials library (each kit's profile, manuals,
//                        parts, publishing); receive to-dos
// Everyone has Chat, Inbox and To-dos (see the team rules below).

export const STUDIO_ROLES = ["admin", "head_production", "product", "head_curriculum", "director_curriculum"] as const;
export type StudioRole = (typeof STUDIO_ROLES)[number];

// "erase" = delete all of a school's data when its contract ends (admins only). "trash" = Recently deleted (admins only).
export type StudioPerm = "lessons" | "library" | "kits" | "codes" | "schools" | "teachers" | "security" | "usage" | "audit" | "team" | "erase" | "trash";

const PERMS: Record<StudioRole, readonly StudioPerm[]> = {
  admin: ["lessons", "library", "kits", "codes", "schools", "teachers", "security", "usage", "audit", "team", "erase", "trash"],
  head_production: ["lessons", "library", "kits", "codes", "schools", "teachers"],
  product: ["lessons", "library", "kits", "codes", "schools", "teachers"],
  head_curriculum: ["lessons", "library"],
  director_curriculum: ["lessons", "library"],
};

export const ROLE_LABEL: Record<StudioRole, string> = {
  admin: "Admin",
  head_production: "Head of Production",
  product: "Product Officer",
  head_curriculum: "Head of Curriculum",
  director_curriculum: "Director of Curriculum",
};

export const ROLE_BLURB: Record<StudioRole, string> = {
  admin: "Everything, including people, roles and Recently deleted.",
  head_production: "Kits, kit codes, schools, teacher access, lessons and materials. Gives to-dos.",
  product: "Creates kits, plus kit codes, schools, teacher access, lessons and materials.",
  head_curriculum: "Lessons and the materials library. Gives to-dos.",
  director_curriculum: "Lessons and the materials library: kit profiles, manuals, parts and publishing.",
};

/** Unknown or retired role values get the least access (Director of Curriculum). */
export const asRole = (v: unknown): StudioRole => (STUDIO_ROLES.includes(v as StudioRole) ? (v as StudioRole) : "director_curriculum");

export const can = (role: StudioRole, perm: StudioPerm) => PERMS[role].includes(perm);

// ---------- Departments and team rules (chat channels, to-dos, notifications) ----------

export const DEPARTMENTS = ["curriculum", "production"] as const;
export type Department = (typeof DEPARTMENTS)[number];
export const DEPARTMENT_LABEL: Record<Department, string> = { curriculum: "Curriculum", production: "Production" };

const DEPT: Record<StudioRole, Department | null> = {
  admin: null,
  head_production: "production",
  product: "production",
  head_curriculum: "curriculum",
  director_curriculum: "curriculum",
};

/** The department a role belongs to (Admins belong to none and see both). */
export const departmentOf = (role: StudioRole) => DEPT[role];

export const isHead = (role: StudioRole) => role === "head_production" || role === "head_curriculum";

/** Who receives to-dos: Directors of Curriculum and Product Officers. */
export const receivesTasks = (role: StudioRole) => role === "director_curriculum" || role === "product";

/** Heads and Admins give to-dos, to Directors of Curriculum and Product Officers (either department). */
export const canAssignTasks = (role: StudioRole) => role === "admin" || isHead(role);

/** Admins and heads see every department's to-dos; everyone else sees their own department's. */
export const canSeeDepartmentTasks = (role: StudioRole, dept: Department) => role === "admin" || isHead(role) || DEPT[role] === dept;

/** For the role pickers: Admin, then each department from head down. */
export const ROLE_GROUPS: { label: string; roles: StudioRole[] }[] = [
  { label: "Admin", roles: ["admin"] },
  { label: "Production", roles: ["head_production", "product"] },
  { label: "Curriculum", roles: ["head_curriculum", "director_curriculum"] },
];

/** Studio light/dark preference (read by the server so the page renders in the right theme). */
export const STUDIO_THEME_COOKIE = "cc_studio_theme";
export const studioTheme = (v: string | undefined): "light" | "dark" => (v === "dark" ? "dark" : "light");

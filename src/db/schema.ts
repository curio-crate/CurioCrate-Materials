import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const orgType = pgEnum("org_type", ["school", "district"]);
export const teacherRole = pgEnum("teacher_role", ["teacher", "support", "admin"]);
export const contentType = pgEnum("content_type", ["lab", "instructions", "video", "pdf", "training", "interactive", "manual"]);
export const tier = pgEnum("tier", ["free", "kit_owner", "subscription"]);
export const orderSource = pgEnum("order_source", ["card", "purchase_order", "distributor", "manual"]);
export const codeStatus = pgEnum("code_status", ["active", "redeemed", "void"]);
export const entitlementKind = pgEnum("entitlement_kind", ["kit", "subscription"]);

// ---------- Organizations & teachers ----------

export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    name: text("name").notNull(),
    type: orgType("type").notNull().default("school"),
    parentId: uuid("parent_id"), // a school's district
    emailDomain: text("email_domain"), // verified domain: teachers with this domain auto-join
    joinCode: text("join_code").notNull(), // colleagues join the school with this code (no second kit code)
    city: text("city"),
    state: text("state"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("organizations_join_code_idx").on(t.joinCode), index("organizations_parent_idx").on(t.parentId)],
);

export const teachers = pgTable(
  "teachers",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    role: teacherRole("role").notNull().default("teacher"),
    isOrgAdmin: boolean("is_org_admin").notNull().default(false),
    // "pending" = joined with the school's join code and waiting for the school admin to approve.
    // Pending teachers get no school-wide access, so a leaked join code unlocks nothing.
    membership: text("membership").notNull().default("active"),
    // Version of the Terms of Use the teacher agreed to (src/lib/terms.ts), and when.
    termsVersion: text("terms_version"),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("teachers_email_idx").on(t.email), index("teachers_org_idx").on(t.orgId)],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: id(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // google | clever | classlink
    providerAccountId: text("provider_account_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("auth_accounts_provider_idx").on(t.provider, t.providerAccountId), index("auth_accounts_teacher_idx").on(t.teacherId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token; the raw token is never stored
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipHash: text("ip_hash"), // keyed hash of the sign-in IP (never the IP itself), for sharing alerts
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_teacher_idx").on(t.teacherId)],
);

// ---------- Company (Studio) accounts: username + password only ----------

export const adminUsers = pgTable(
  "admin_users",
  {
    id: id(),
    username: text("username").notNull(),
    name: text("name").notNull(),
    email: text("email"), // people added by email sign in with it (or their username)
    // one of STUDIO_ROLES in src/lib/auth/roles.ts (admin, product, head_/director_ of production or curriculum, team)
    role: text("role").notNull().default("admin"),
    avatarKey: text("avatar_key"), // profile picture in storage (avatars/…), shown in chat, the sidebar and Team
    passwordHash: text("password_hash").notNull(), // scrypt:<saltHex>:<hashHex>
    active: boolean("active").notNull().default(true),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }).notNull().defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("admin_users_username_idx").on(t.username), uniqueIndex("admin_users_email_idx").on(t.email)],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: text("id").primaryKey(), // sha256 of the random session id inside the signed cookie
    adminId: uuid("admin_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("admin_sessions_admin_idx").on(t.adminId)],
);

// ---------- Kits & content ----------

export const kits = pgTable(
  "kits",
  {
    id: id(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    code: text("code").notNull(),
    gradeBand: text("grade_band").notNull(),
    gradeMin: integer("grade_min").notNull(),
    gradeMax: integer("grade_max").notNull(),
    tagline: text("tagline").notNull(),
    description: text("description").notNull(),
    // draft = just created by a Product Officer and still being built by Curriculum (hidden from teachers);
    // available / in_development = published
    status: text("status").notNull().default("available"),
    kind: text("kind").notNull().default("physical"), // physical | online
    accent: text("accent").notNull().default("lum"),
    inTheBox: jsonb("in_the_box").$type<string[]>().notNull().default([]),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    ngss: text("ngss").array().notNull().default(sql`'{}'::text[]`),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("kits_slug_idx").on(t.slug), uniqueIndex("kits_code_idx").on(t.code)],
);

/** A physical kit's parts and components, with pricing (Studio only; teachers see names as "In the box"). */
export const kitParts = pgTable(
  "kit_parts",
  {
    id: id(),
    kitId: uuid("kit_id")
      .notNull()
      .references(() => kits.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull().default(1), // per kit
    unitCostCents: integer("unit_cost_cents"),
    supplier: text("supplier"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("kit_parts_kit_idx").on(t.kitId)],
);

export const kitVersions = pgTable(
  "kit_versions",
  {
    id: id(),
    kitId: uuid("kit_id")
      .notNull()
      .references(() => kits.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    notes: text("notes"),
    isCurrent: boolean("is_current").notNull().default(true),
    releasedAt: timestamp("released_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("kit_versions_kit_version_idx").on(t.kitId, t.version)],
);

export type Block =
  | { type: "p"; text: string }
  | { type: "h"; text: string }
  | { type: "steps"; items: string[] }
  | { type: "list"; items: string[] }
  | { type: "materials"; items: string[] }
  | { type: "callout"; tone: "safety" | "tip" | "teacher"; title: string; text: string }
  | { type: "explain"; prompt: string }
  | { type: "table"; head: string[]; rows: string[][] };

export type Cue = { start: number; end: number; text: string };

export const contentItems = pgTable(
  "content_items",
  {
    id: id(),
    kitId: uuid("kit_id").references(() => kits.id, { onDelete: "cascade" }), // null only for general training
    kitVersionId: uuid("kit_version_id").references(() => kitVersions.id, { onDelete: "set null" }),
    parentId: uuid("parent_id"), // resources (pdf/video/lab) attached to a lesson
    slug: text("slug").notNull(),
    type: contentType("type").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    requiredTier: tier("required_tier").notNull(),
    isSample: boolean("is_sample").notNull().default(false),
    minutes: integer("minutes"),
    ngss: text("ngss").array().notNull().default(sql`'{}'::text[]`),
    body: jsonb("body").$type<Block[]>().notNull().default([]),
    section: text("section"), // e.g. manual section "A.3"
    // Lesson materials added in Studio: training_video | demo | manual | teacher_manual | file
    materialKind: text("material_kind"),
    sortOrder: integer("sort_order").notNull().default(0),
    // Files & media (keys into storage / video provider; never public URLs)
    fileKey: text("file_key"),
    fileName: text("file_name"),
    fileBytes: integer("file_bytes"),
    videoAssetId: text("video_asset_id"),
    videoDurationSec: integer("video_duration_sec"),
    captions: jsonb("captions").$type<Cue[]>(),
    labSlug: text("lab_slug"),
    // Interactive (HTML/JS) lessons: storage prefix of the unpacked package and its start page
    packageKey: text("package_key"),
    packageEntry: text("package_entry"),
    mediaStatus: text("media_status"), // studio uploads: processing | ready | failed
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("content_items_slug_idx").on(t.slug),
    index("content_items_kit_idx").on(t.kitId),
    index("content_items_parent_idx").on(t.parentId),
  ],
);

// ---------- Orders, codes, entitlements ----------

export const orders = pgTable(
  "orders",
  {
    id: id(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    source: orderSource("source").notNull(),
    reference: text("reference"), // PO number, distributor invoice or Stripe checkout session id
    customerName: text("customer_name"),
    customerEmail: text("customer_email"),
    notes: text("notes"),
    createdByTeacherId: uuid("created_by_teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("orders_source_reference_idx").on(t.source, t.reference)],
);

export const orderLines = pgTable("order_lines", {
  id: id(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  kitId: uuid("kit_id")
    .notNull()
    .references(() => kits.id),
  quantity: integer("quantity").notNull(),
});

export const redemptionCodes = pgTable(
  "redemption_codes",
  {
    id: id(),
    code: text("code").notNull(), // normalized: no dashes, uppercase
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kitId: uuid("kit_id")
      .notNull()
      .references(() => kits.id),
    status: codeStatus("status").notNull().default("active"),
    redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
    redeemedByTeacherId: uuid("redeemed_by_teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    redeemedOrgId: uuid("redeemed_org_id").references(() => organizations.id, { onDelete: "set null" }),
    reissuedFromId: uuid("reissued_from_id"),
    voidReason: text("void_reason"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("redemption_codes_code_idx").on(t.code), index("redemption_codes_order_idx").on(t.orderId)],
);

export const entitlements = pgTable(
  "entitlements",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "cascade" }), // set = individual subscription
    kind: entitlementKind("kind").notNull(),
    kitId: uuid("kit_id").references(() => kits.id),
    plan: text("plan"),
    source: text("source").notNull(), // redemption | manual | stripe | purchase_order
    sourceRef: text("source_ref"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    endsAt: timestamp("ends_at", { withTimezone: true }), // null = never expires (kit access)
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    createdAt: createdAt(),
  },
  (t) => [index("entitlements_org_idx").on(t.orgId), uniqueIndex("entitlements_source_ref_idx").on(t.source, t.sourceRef)],
);

// ---------- Usage, audit ----------

export const videoPlaybacks = pgTable(
  "video_playbacks",
  {
    id: id(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "cascade" }),
    classId: uuid("class_id"),
    rendition: text("rendition").notNull().default("auto"),
    secondsWatched: integer("seconds_watched").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    lastBeatAt: timestamp("last_beat_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("video_playbacks_org_idx").on(t.orgId, t.startedAt)],
);

export const contentViews = pgTable(
  "content_views",
  {
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    lastViewedAt: timestamp("last_viewed_at", { withTimezone: true }).notNull().defaultNow(),
    views: integer("views").notNull().default(1),
  },
  (t) => [primaryKey({ columns: [t.teacherId, t.contentId] }), index("content_views_org_idx").on(t.orgId)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    actorTeacherId: uuid("actor_teacher_id").references(() => teachers.id, { onDelete: "set null" }),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "cascade" }),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_created_idx").on(t.createdAt)],
);

// ---------- Phase 2: classes, anonymous students, labs ----------

export const classes = pgTable(
  "classes",
  {
    id: id(),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => teachers.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    classCode: text("class_code").notNull(),
    curieEnabled: boolean("curie_enabled").notNull().default(false),
    curieDailyLimit: integer("curie_daily_limit").notNull().default(200),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("classes_code_idx").on(t.classCode), index("classes_teacher_idx").on(t.teacherId)],
);

export const classAssignments = pgTable(
  "class_assignments",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    contentId: uuid("content_id")
      .notNull()
      .references(() => contentItems.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.classId, t.contentId] })],
);

/** A student's device in a class. Deliberately no name, email or any personal field. */
export const studentSessions = pgTable(
  "student_sessions",
  {
    id: id(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    nickname: text("nickname").notNull(), // generated from a fixed word list, never typed by the student
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("student_sessions_token_idx").on(t.tokenHash), index("student_sessions_class_idx").on(t.classId)],
);

/**
 * A free student account (ages 13 and up only; younger students use a class code). Holds the minimum needed to
 * sign in: email, password hash, a nickname generated from fixed word lists, and the birth year from the age screen.
 * No name, school, photo or free text.
 */
export const studentAccounts = pgTable(
  "student_accounts",
  {
    id: id(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    nickname: text("nickname").notNull(),
    birthYear: integer("birth_year").notNull(),
    termsVersion: text("terms_version").notNull(),
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }).notNull().defaultNow(),
    failedLogins: integer("failed_logins").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: createdAt(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("student_accounts_email_idx").on(t.email)],
);

export const studentAccountSessions = pgTable(
  "student_account_sessions",
  {
    id: id(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => studentAccounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("student_account_sessions_token_idx").on(t.tokenHash), index("student_account_sessions_account_idx").on(t.accountId)],
);

export const labRuns = pgTable(
  "lab_runs",
  {
    id: id(),
    labSlug: text("lab_slug").notNull(),
    classId: uuid("class_id").references(() => classes.id, { onDelete: "cascade" }),
    studentSessionId: uuid("student_session_id").references(() => studentSessions.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "cascade" }),
    data: jsonb("data").$type<Record<string, number | string | boolean | number[]>>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("lab_runs_class_idx").on(t.classId)],
);

// ---------- Phase 3: Curie.AI, subscriptions ----------

export const curieMessages = pgTable(
  "curie_messages",
  {
    id: id(),
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    studentSessionId: uuid("student_session_id").references(() => studentSessions.id, { onDelete: "cascade" }),
    contentSlug: text("content_slug"),
    role: text("role").notNull(), // user | assistant
    content: text("content").notNull(),
    flagged: text("flagged"), // why a message was refused / redirected
    createdAt: createdAt(),
  },
  (t) => [index("curie_messages_class_idx").on(t.classId, t.createdAt)],
);

export const curieUsage = pgTable(
  "curie_usage",
  {
    classId: uuid("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "cascade" }),
    day: text("day").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.classId, t.day] })],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: id(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => teachers.id, { onDelete: "cascade" }),
    plan: text("plan").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    status: text("status").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("subscriptions_stripe_idx").on(t.stripeSubscriptionId)],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- Studio team: chat, notifications, to-dos, Recently deleted ----------

/**
 * One chat message. `channel` is "all", "curriculum", "production" (open to every Studio account) or
 * "dm:<idA>:<idB>" (the two account ids in sorted order; only those two can read it). `updated_at` moves on send,
 * delete and restore, so clients poll for "everything changed since" and stay in step.
 */
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: id(),
    channel: text("channel").notNull(),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    fileKey: text("file_key"),
    fileName: text("file_name"),
    fileBytes: integer("file_bytes"),
    isImage: boolean("is_image").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("chat_messages_channel_idx").on(t.channel, t.createdAt), index("chat_messages_updated_idx").on(t.channel, t.updatedAt)],
);

/** How far each person has read each channel (for unread badges). */
export const chatReads = pgTable(
  "chat_reads",
  {
    adminId: uuid("admin_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.adminId, t.channel] })],
);

/** Inbox items: to-dos assigned and done, new kits (curriculum), sign-ins and security risks (admins). */
export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // task_assigned | task_done | task_overdue | kit_created | login | security
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_recipient_idx").on(t.recipientId, t.createdAt)],
);

/** A to-do a head (or admin) gives a director. The director's whole department can see it. */
export const tasks = pgTable(
  "tasks",
  {
    id: id(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    department: text("department").notNull(), // the assignee's department: curriculum | production
    assigneeId: uuid("assignee_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    assignedById: uuid("assigned_by_id").references(() => adminUsers.id, { onDelete: "set null" }),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    status: text("status").notNull().default("open"), // open | done
    doneAt: timestamp("done_at", { withTimezone: true }),
    overdueNotifiedAt: timestamp("overdue_notified_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("tasks_assignee_idx").on(t.assigneeId), index("tasks_department_idx").on(t.department, t.status)],
);

/**
 * Recently deleted (admins only). A deleted lesson/file keeps a copy of its rows here (its stored files stay in
 * storage) until an admin restores it, deletes it forever, or `purge_after` passes. A deleted chat message is
 * hidden (deleted_at) and listed here the same way.
 */
export const trash = pgTable(
  "trash",
  {
    id: id(),
    kind: text("kind").notNull(), // content | message
    title: text("title").notNull(),
    detail: text("detail").notNull().default(""),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    deletedById: uuid("deleted_by_id").references(() => adminUsers.id, { onDelete: "set null" }),
    deletedByName: text("deleted_by_name").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull().defaultNow(),
    purgeAfter: timestamp("purge_after", { withTimezone: true }).notNull(),
  },
  (t) => [index("trash_deleted_idx").on(t.deletedAt)],
);

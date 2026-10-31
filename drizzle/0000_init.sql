CREATE TYPE "public"."code_status" AS ENUM('active', 'redeemed', 'void');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('lab', 'instructions', 'video', 'pdf', 'training');--> statement-breakpoint
CREATE TYPE "public"."entitlement_kind" AS ENUM('kit', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."order_source" AS ENUM('card', 'purchase_order', 'distributor', 'manual');--> statement-breakpoint
CREATE TYPE "public"."org_type" AS ENUM('school', 'district');--> statement-breakpoint
CREATE TYPE "public"."teacher_role" AS ENUM('teacher', 'support', 'admin');--> statement-breakpoint
CREATE TYPE "public"."tier" AS ENUM('free', 'kit_owner', 'subscription');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_teacher_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"org_id" uuid,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kit_id" uuid,
	"kit_version_id" uuid,
	"parent_id" uuid,
	"slug" text NOT NULL,
	"type" "content_type" NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"required_tier" "tier" NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"minutes" integer,
	"ngss" text[] DEFAULT '{}'::text[] NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"section" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"file_key" text,
	"file_name" text,
	"file_bytes" integer,
	"video_asset_id" text,
	"video_duration_sec" integer,
	"captions" jsonb,
	"lab_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_views" (
	"org_id" uuid,
	"teacher_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"views" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "content_views_teacher_id_content_id_pk" PRIMARY KEY("teacher_id","content_id")
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"teacher_id" uuid,
	"kind" "entitlement_kind" NOT NULL,
	"kit_id" uuid,
	"plan" text,
	"source" text NOT NULL,
	"source_ref" text,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kit_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kit_id" uuid NOT NULL,
	"version" text NOT NULL,
	"notes" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"released_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"code" text NOT NULL,
	"grade_band" text NOT NULL,
	"grade_min" integer NOT NULL,
	"grade_max" integer NOT NULL,
	"tagline" text NOT NULL,
	"description" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"accent" text DEFAULT 'lum' NOT NULL,
	"in_the_box" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ngss" text[] DEFAULT '{}'::text[] NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"kit_id" uuid NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"source" "order_source" NOT NULL,
	"reference" text,
	"customer_name" text,
	"customer_email" text,
	"notes" text,
	"created_by_teacher_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" "org_type" DEFAULT 'school' NOT NULL,
	"parent_id" uuid,
	"email_domain" text,
	"join_code" text NOT NULL,
	"city" text,
	"state" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemption_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"order_id" uuid NOT NULL,
	"kit_id" uuid NOT NULL,
	"status" "code_status" DEFAULT 'active' NOT NULL,
	"redeemed_at" timestamp with time zone,
	"redeemed_by_teacher_id" uuid,
	"redeemed_org_id" uuid,
	"reissued_from_id" uuid,
	"void_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"teacher_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"org_id" uuid,
	"role" "teacher_role" DEFAULT 'teacher' NOT NULL,
	"is_org_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "video_playbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"content_id" uuid NOT NULL,
	"teacher_id" uuid,
	"class_id" uuid,
	"rendition" text DEFAULT 'auto' NOT NULL,
	"seconds_watched" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_beat_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_teacher_id_teachers_id_fk" FOREIGN KEY ("actor_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_kit_version_id_kit_versions_id_fk" FOREIGN KEY ("kit_version_id") REFERENCES "public"."kit_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_views" ADD CONSTRAINT "content_views_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_views" ADD CONSTRAINT "content_views_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_views" ADD CONSTRAINT "content_views_content_id_content_items_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_versions" ADD CONSTRAINT "kit_versions_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_teacher_id_teachers_id_fk" FOREIGN KEY ("created_by_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_redeemed_by_teacher_id_teachers_id_fk" FOREIGN KEY ("redeemed_by_teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_codes" ADD CONSTRAINT "redemption_codes_redeemed_org_id_organizations_id_fk" FOREIGN KEY ("redeemed_org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_playbacks" ADD CONSTRAINT "video_playbacks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_playbacks" ADD CONSTRAINT "video_playbacks_content_id_content_items_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_playbacks" ADD CONSTRAINT "video_playbacks_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_provider_idx" ON "auth_accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "auth_accounts_teacher_idx" ON "auth_accounts" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_items_slug_idx" ON "content_items" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_items_kit_idx" ON "content_items" USING btree ("kit_id");--> statement-breakpoint
CREATE INDEX "content_items_parent_idx" ON "content_items" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "content_views_org_idx" ON "content_views" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "entitlements_org_idx" ON "entitlements" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_source_ref_idx" ON "entitlements" USING btree ("source","source_ref");--> statement-breakpoint
CREATE UNIQUE INDEX "kit_versions_kit_version_idx" ON "kit_versions" USING btree ("kit_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "kits_slug_idx" ON "kits" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "kits_code_idx" ON "kits" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_source_reference_idx" ON "orders" USING btree ("source","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_join_code_idx" ON "organizations" USING btree ("join_code");--> statement-breakpoint
CREATE INDEX "organizations_parent_idx" ON "organizations" USING btree ("parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "redemption_codes_code_idx" ON "redemption_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "redemption_codes_order_idx" ON "redemption_codes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "sessions_teacher_idx" ON "sessions" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_email_idx" ON "teachers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "teachers_org_idx" ON "teachers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "video_playbacks_org_idx" ON "video_playbacks" USING btree ("org_id","started_at");
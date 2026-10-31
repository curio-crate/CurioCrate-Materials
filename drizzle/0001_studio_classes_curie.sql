CREATE TABLE "class_assignments" (
	"class_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "class_assignments_class_id_content_id_pk" PRIMARY KEY("class_id","content_id")
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"class_code" text NOT NULL,
	"curie_enabled" boolean DEFAULT false NOT NULL,
	"curie_daily_limit" integer DEFAULT 200 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curie_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"student_session_id" uuid,
	"content_slug" text,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"flagged" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curie_usage" (
	"class_id" uuid NOT NULL,
	"day" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "curie_usage_class_id_day_pk" PRIMARY KEY("class_id","day")
);
--> statement-breakpoint
CREATE TABLE "lab_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lab_slug" text NOT NULL,
	"class_id" uuid,
	"student_session_id" uuid,
	"teacher_id" uuid,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"class_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"teacher_id" uuid,
	"plan" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text NOT NULL,
	"status" text NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_items" ADD COLUMN "media_status" text;--> statement-breakpoint
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_assignments" ADD CONSTRAINT "class_assignments_content_id_content_items_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curie_messages" ADD CONSTRAINT "curie_messages_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curie_messages" ADD CONSTRAINT "curie_messages_student_session_id_student_sessions_id_fk" FOREIGN KEY ("student_session_id") REFERENCES "public"."student_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "curie_usage" ADD CONSTRAINT "curie_usage_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_student_session_id_student_sessions_id_fk" FOREIGN KEY ("student_session_id") REFERENCES "public"."student_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_runs" ADD CONSTRAINT "lab_runs_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_sessions" ADD CONSTRAINT "student_sessions_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "classes_code_idx" ON "classes" USING btree ("class_code");--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "curie_messages_class_idx" ON "curie_messages" USING btree ("class_id","created_at");--> statement-breakpoint
CREATE INDEX "lab_runs_class_idx" ON "lab_runs" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_sessions_token_idx" ON "student_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "student_sessions_class_idx" ON "student_sessions" USING btree ("class_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_stripe_idx" ON "subscriptions" USING btree ("stripe_subscription_id");
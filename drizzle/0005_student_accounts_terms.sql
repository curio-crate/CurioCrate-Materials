CREATE TABLE "student_account_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"nickname" text NOT NULL,
	"birth_year" integer NOT NULL,
	"terms_version" text NOT NULL,
	"terms_accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teachers" ADD COLUMN "terms_version" text;--> statement-breakpoint
ALTER TABLE "teachers" ADD COLUMN "terms_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "student_account_sessions" ADD CONSTRAINT "student_account_sessions_account_id_student_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."student_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "student_account_sessions_token_idx" ON "student_account_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "student_account_sessions_account_idx" ON "student_account_sessions" USING btree ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "student_accounts_email_idx" ON "student_accounts" USING btree ("email");
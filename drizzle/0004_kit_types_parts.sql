CREATE TABLE "kit_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kit_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_cost_cents" integer,
	"supplier" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kits" ADD COLUMN "kind" text DEFAULT 'physical' NOT NULL;--> statement-breakpoint
ALTER TABLE "kit_parts" ADD CONSTRAINT "kit_parts_kit_id_kits_id_fk" FOREIGN KEY ("kit_id") REFERENCES "public"."kits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kit_parts_kit_idx" ON "kit_parts" USING btree ("kit_id");--> statement-breakpoint
-- Existing kits: their "In the box" list becomes the starting parts list (quantity 1, no price yet).
INSERT INTO "kit_parts" ("kit_id", "name", "sort_order") SELECT k."id", e.value, e.ord::integer FROM "kits" k, jsonb_array_elements_text(k."in_the_box") WITH ORDINALITY AS e(value, ord);

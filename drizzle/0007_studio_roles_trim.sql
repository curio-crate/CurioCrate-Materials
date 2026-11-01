-- Studio roles are Admin, Head of Production, Product Officer, Head of Curriculum, Director of Curriculum.
-- The old Curriculum role becomes Director of Curriculum (same access); the briefly added production roles become Product Officer.
UPDATE "admin_users" SET "role" = 'director_curriculum' WHERE "role" = 'curriculum';--> statement-breakpoint
UPDATE "admin_users" SET "role" = 'product' WHERE "role" IN ('director_production', 'production');

ALTER TABLE "task_categories" ADD COLUMN "scope" text DEFAULT 'kanban' NOT NULL;
--> statement-breakpoint
ALTER TABLE "task_categories" ADD COLUMN "icon" text DEFAULT 'tag' NOT NULL;
--> statement-breakpoint
DROP INDEX "task_categories_owner_name_idx";
--> statement-breakpoint
CREATE UNIQUE INDEX "task_categories_owner_scope_name_idx" ON "task_categories" USING btree ("owner_id","scope","name");
--> statement-breakpoint
INSERT INTO "task_categories" ("owner_id", "name", "color", "scope", "icon")
SELECT DISTINCT c."owner_id", c."name", c."color", 'calendar', 'calendar-days'
FROM "task_categories" c
INNER JOIN "calendar_items" i ON i."category_id" = c."id"
WHERE i."kind" = 'task'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO "task_categories" ("owner_id", "name", "color", "scope", "icon")
SELECT DISTINCT c."owner_id", c."name", c."color", 'reminders', 'bell'
FROM "task_categories" c
INNER JOIN "calendar_items" i ON i."category_id" = c."id"
WHERE i."kind" = 'reminder'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "calendar_items" i
SET "category_id" = replacement."id"
FROM "task_categories" original, "task_categories" replacement
WHERE i."category_id" = original."id"
  AND replacement."owner_id" = original."owner_id"
  AND replacement."name" = original."name"
  AND replacement."scope" = CASE WHEN i."kind" = 'reminder' THEN 'reminders' ELSE 'calendar' END;
--> statement-breakpoint
ALTER TABLE "notes" ADD COLUMN "category_id" integer;
--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_category_id_task_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "user_settings" (
  "owner_id" text PRIMARY KEY NOT NULL,
  "theme" text DEFAULT 'system' NOT NULL,
  "notify_reminders" boolean DEFAULT true NOT NULL,
  "notify_daily_summary" boolean DEFAULT false NOT NULL,
  "notify_collaboration" boolean DEFAULT true NOT NULL,
  "default_calendar_view" text DEFAULT 'month' NOT NULL,
  "default_task_priority" text DEFAULT 'medium' NOT NULL,
  "note_auto_save" boolean DEFAULT true NOT NULL,
  "ai_model" text DEFAULT 'gemini-2.5-flash' NOT NULL,
  "ai_behavior" text DEFAULT 'balanced' NOT NULL,
  "ai_tone" text DEFAULT 'Friendly' NOT NULL,
  "ai_refine_enabled" boolean DEFAULT true NOT NULL,
  "ai_diagram_enabled" boolean DEFAULT true NOT NULL,
  "ai_processing_enabled" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

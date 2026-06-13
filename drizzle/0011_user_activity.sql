CREATE TABLE "user_activity" (
  "id" serial PRIMARY KEY NOT NULL,
  "actor_id" text NOT NULL,
  "feature" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "title" text NOT NULL,
  "href" text,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_activity_actor_created_idx" ON "user_activity" USING btree ("actor_id","created_at");
--> statement-breakpoint
CREATE INDEX "user_activity_actor_entity_idx" ON "user_activity" USING btree ("actor_id","entity_type","entity_id");

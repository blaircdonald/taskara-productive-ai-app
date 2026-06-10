CREATE TABLE "notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"title" text DEFAULT 'Untitled note' NOT NULL,
	"content" jsonb DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb NOT NULL,
	"color" text DEFAULT '#d97706' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"trashed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notes_owner_idx" ON "notes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "notes_owner_pinned_updated_idx" ON "notes" USING btree ("owner_id","is_pinned","updated_at");--> statement-breakpoint
CREATE INDEX "notes_owner_trashed_idx" ON "notes" USING btree ("owner_id","trashed_at");
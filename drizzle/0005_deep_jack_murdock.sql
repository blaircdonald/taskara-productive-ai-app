CREATE TABLE "whiteboards" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text DEFAULT 'Untitled whiteboard' NOT NULL,
	"color" text DEFAULT '#db2777' NOT NULL,
	"elements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"app_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"files" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "whiteboards_owner_updated_idx" ON "whiteboards" USING btree ("owner_id","updated_at");
CREATE TABLE "kanban_board_members" (
	"board_id" integer NOT NULL,
	"email" text NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"invited_by" text NOT NULL,
	"invited_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kanban_board_members_board_id_email_pk" PRIMARY KEY("board_id","email")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "kanban_board_members" ADD CONSTRAINT "kanban_board_members_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kanban_board_members_email_idx" ON "kanban_board_members" USING btree ("email");
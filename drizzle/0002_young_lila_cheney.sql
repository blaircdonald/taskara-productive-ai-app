CREATE TABLE "kanban_boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_columns" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"position" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_task_labels" (
	"task_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "kanban_task_labels_task_id_category_id_pk" PRIMARY KEY("task_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "kanban_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"column_id" integer NOT NULL,
	"owner_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" date NOT NULL,
	"priority" text NOT NULL,
	"position" integer NOT NULL,
	"calendar_item_id" integer,
	"notes_linked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kanban_columns" ADD CONSTRAINT "kanban_columns_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_task_labels" ADD CONSTRAINT "kanban_task_labels_task_id_kanban_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."kanban_tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_task_labels" ADD CONSTRAINT "kanban_task_labels_category_id_task_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_column_id_kanban_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."kanban_columns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_calendar_item_id_calendar_items_id_fk" FOREIGN KEY ("calendar_item_id") REFERENCES "public"."calendar_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kanban_boards_owner_idx" ON "kanban_boards" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "kanban_columns_board_position_idx" ON "kanban_columns" USING btree ("board_id","position");--> statement-breakpoint
CREATE INDEX "kanban_task_labels_task_position_idx" ON "kanban_task_labels" USING btree ("task_id","position");--> statement-breakpoint
CREATE INDEX "kanban_tasks_column_position_idx" ON "kanban_tasks" USING btree ("column_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "kanban_tasks_calendar_item_idx" ON "kanban_tasks" USING btree ("calendar_item_id");
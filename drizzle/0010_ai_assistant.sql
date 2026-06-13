CREATE TABLE "assistant_threads" (
  "id" serial PRIMARY KEY NOT NULL,
  "owner_id" text NOT NULL,
  "title" text DEFAULT 'New conversation' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "thread_id" integer NOT NULL,
  "owner_id" text NOT NULL,
  "role" text NOT NULL,
  "content" text NOT NULL,
  "source" text DEFAULT 'text' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistant_action_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "thread_id" integer NOT NULL,
  "owner_id" text NOT NULL,
  "action" text NOT NULL,
  "arguments" jsonb NOT NULL,
  "summary" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "result" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "resolved_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "assistant_messages" ADD CONSTRAINT "assistant_messages_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "assistant_action_requests" ADD CONSTRAINT "assistant_action_requests_thread_id_assistant_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."assistant_threads"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "assistant_threads_owner_updated_idx" ON "assistant_threads" USING btree ("owner_id","updated_at");
--> statement-breakpoint
CREATE INDEX "assistant_messages_thread_created_idx" ON "assistant_messages" USING btree ("thread_id","created_at");
--> statement-breakpoint
CREATE INDEX "assistant_messages_owner_idx" ON "assistant_messages" USING btree ("owner_id");
--> statement-breakpoint
CREATE INDEX "assistant_action_requests_owner_status_idx" ON "assistant_action_requests" USING btree ("owner_id","status");
--> statement-breakpoint
CREATE INDEX "assistant_action_requests_thread_idx" ON "assistant_action_requests" USING btree ("thread_id");

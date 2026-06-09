import { date, integer, pgTable, serial, text, time, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  authorId: serial("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const taskCategories = pgTable(
  "task_categories",
  {
    id: serial("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("task_categories_owner_name_idx").on(table.ownerId, table.name)],
);

export const calendarItems = pgTable("calendar_items", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  kind: text("kind").notNull(),
  description: text("description"),
  scheduledDate: date("scheduled_date"),
  scheduledTime: time("scheduled_time"),
  categoryId: integer("category_id")
    .notNull()
    .references(() => taskCategories.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TaskCategory = typeof taskCategories.$inferSelect;
export type CalendarItem = typeof calendarItems.$inferSelect;

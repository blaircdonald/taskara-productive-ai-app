import { boolean, date, index, integer, jsonb, pgTable, primaryKey, serial, text, time, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").unique(),
  name: text("name"),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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

export const kanbanBoards = pgTable("kanban_boards", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("kanban_boards_owner_idx").on(table.ownerId)]);

export const kanbanBoardMembers = pgTable("kanban_board_members", {
  boardId: integer("board_id").notNull().references(() => kanbanBoards.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("editor"),
  invitedBy: text("invited_by").notNull(),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.boardId, table.email] }),
  index("kanban_board_members_email_idx").on(table.email),
]);

export const kanbanColumns = pgTable("kanban_columns", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull().references(() => kanbanBoards.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [index("kanban_columns_board_position_idx").on(table.boardId, table.position)]);

export const kanbanTasks = pgTable("kanban_tasks", {
  id: serial("id").primaryKey(),
  boardId: integer("board_id").notNull().references(() => kanbanBoards.id, { onDelete: "cascade" }),
  columnId: integer("column_id").notNull().references(() => kanbanColumns.id, { onDelete: "cascade" }),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: date("due_date").notNull(),
  priority: text("priority").notNull(),
  position: integer("position").notNull(),
  calendarItemId: integer("calendar_item_id").references(() => calendarItems.id, { onDelete: "set null" }),
  notesLinked: boolean("notes_linked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("kanban_tasks_column_position_idx").on(table.columnId, table.position),
  uniqueIndex("kanban_tasks_calendar_item_idx").on(table.calendarItemId),
]);

export const kanbanTaskLabels = pgTable("kanban_task_labels", {
  taskId: integer("task_id").notNull().references(() => kanbanTasks.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => taskCategories.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
}, (table) => [
  primaryKey({ columns: [table.taskId, table.categoryId] }),
  index("kanban_task_labels_task_position_idx").on(table.taskId, table.position),
]);

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull().default("Untitled note"),
  content: jsonb("content").notNull().default({ type: "doc", content: [{ type: "paragraph" }] }),
  color: text("color").notNull().default("#d97706"),
  isPinned: boolean("is_pinned").notNull().default(false),
  trashedAt: timestamp("trashed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("notes_owner_idx").on(table.ownerId),
  index("notes_owner_pinned_updated_idx").on(table.ownerId, table.isPinned, table.updatedAt),
  index("notes_owner_trashed_idx").on(table.ownerId, table.trashedAt),
]);

export const whiteboards = pgTable("whiteboards", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull().default("Untitled whiteboard"),
  color: text("color").notNull().default("#db2777"),
  elements: jsonb("elements").notNull().default([]),
  appState: jsonb("app_state").notNull().default({}),
  files: jsonb("files").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("whiteboards_owner_updated_idx").on(table.ownerId, table.updatedAt),
]);

export const spaces = pgTable("spaces", {
  id: serial("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull().default("#7c3aed"),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("spaces_owner_updated_idx").on(table.ownerId, table.updatedAt),
  index("spaces_owner_archived_idx").on(table.ownerId, table.archivedAt),
]);

export const spaceMembers = pgTable("space_members", {
  spaceId: integer("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("editor"),
  invitedBy: text("invited_by").notNull(),
  invitedAt: timestamp("invited_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.spaceId, table.email] }),
  index("space_members_email_idx").on(table.email),
]);

export const pages = pgTable("pages", {
  id: serial("id").primaryKey(),
  spaceId: integer("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  template: text("template").notNull().default("blank"),
  content: jsonb("content").notNull().default({ type: "doc", content: [{ type: "paragraph" }] }),
  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
  archivedAt: timestamp("archived_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("pages_space_updated_idx").on(table.spaceId, table.updatedAt),
  index("pages_space_archived_idx").on(table.spaceId, table.archivedAt),
]);

export const spaceFavorites = pgTable("space_favorites", {
  spaceId: integer("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.spaceId, table.userId] }),
  index("space_favorites_user_idx").on(table.userId),
]);

export const pageFavorites = pgTable("page_favorites", {
  pageId: integer("page_id").notNull().references(() => pages.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.pageId, table.userId] }),
  index("page_favorites_user_idx").on(table.userId),
]);

export const spaceActivity = pgTable("space_activity", {
  spaceId: integer("space_id").notNull().references(() => spaces.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  openedAt: timestamp("opened_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.spaceId, table.userId] }),
  index("space_activity_user_opened_idx").on(table.userId, table.openedAt),
]);

export type TaskCategory = typeof taskCategories.$inferSelect;
export type CalendarItem = typeof calendarItems.$inferSelect;
export type KanbanBoard = typeof kanbanBoards.$inferSelect;
export type KanbanBoardMember = typeof kanbanBoardMembers.$inferSelect;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;
export type KanbanTask = typeof kanbanTasks.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Whiteboard = typeof whiteboards.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type Page = typeof pages.$inferSelect;

"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, inArray, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  calendarItems,
  db,
  kanbanBoards,
  kanbanColumns,
  kanbanTaskLabels,
  kanbanTasks,
  taskCategories,
} from "@/db";

const colorPattern = /^#[0-9a-fA-F]{6}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const priorities = ["low", "medium", "high"] as const;

async function ownerId() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in.");
  return userId;
}

function nameValue(value: string, label: string) {
  const name = value.trim();
  if (!name || name.length > 80) throw new Error(`${label} must be between 1 and 80 characters.`);
  return name;
}

function colorValue(value: string) {
  if (!colorPattern.test(value)) throw new Error("Choose a valid color.");
  return value;
}

function taskValues(input: TaskInput) {
  const title = input.title.trim();
  if (!title || title.length > 140) throw new Error("Enter a title under 140 characters.");
  if (!datePattern.test(input.dueDate)) throw new Error("Choose a valid due date.");
  if (!priorities.includes(input.priority)) throw new Error("Choose a valid priority.");
  return { title, description: input.description.trim().slice(0, 1000) || null };
}

async function ownedBoard(owner: string, boardId: number) {
  const board = await db.select().from(kanbanBoards).where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.ownerId, owner))).limit(1);
  if (!board.length) throw new Error("Board not found.");
  return board[0];
}

async function ownedColumn(owner: string, columnId: number) {
  const column = await db.select().from(kanbanColumns).where(and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.ownerId, owner))).limit(1);
  if (!column.length) throw new Error("Column not found.");
  return column[0];
}

async function ownedTask(owner: string, taskId: number) {
  const task = await db.select().from(kanbanTasks).where(and(eq(kanbanTasks.id, taskId), eq(kanbanTasks.ownerId, owner))).limit(1);
  if (!task.length) throw new Error("Task not found.");
  return task[0];
}

async function validateLabels(owner: string, labelIds: number[]) {
  const unique = [...new Set(labelIds)].slice(0, 12);
  if (!unique.length) return [];
  const labels = await db.select().from(taskCategories).where(and(eq(taskCategories.ownerId, owner), inArray(taskCategories.id, unique)));
  if (labels.length !== unique.length) throw new Error("One or more labels are invalid.");
  return unique.map((id) => labels.find((label) => label.id === id)!);
}

async function kanbanCategory(owner: string) {
  const existing = await db.select().from(taskCategories).where(and(eq(taskCategories.ownerId, owner), eq(taskCategories.name, "Kanban"))).limit(1);
  if (existing.length) return existing[0];
  const [created] = await db.insert(taskCategories).values({ ownerId: owner, name: "Kanban", color: "#2563eb" }).onConflictDoNothing().returning();
  if (created) return created;
  return (await db.select().from(taskCategories).where(and(eq(taskCategories.ownerId, owner), eq(taskCategories.name, "Kanban"))).limit(1))[0];
}

async function syncCalendar(owner: string, task: typeof kanbanTasks.$inferSelect, labels: { id: number }[], enabled: boolean) {
  if (!enabled) {
    if (task.calendarItemId) await db.delete(calendarItems).where(and(eq(calendarItems.id, task.calendarItemId), eq(calendarItems.ownerId, owner)));
    return null;
  }
  const category = labels[0] ?? await kanbanCategory(owner);
  if (task.calendarItemId) {
    const updated = await db.update(calendarItems).set({
      title: task.title,
      description: task.description,
      scheduledDate: task.dueDate,
      categoryId: category.id,
      kind: "task",
      updatedAt: new Date(),
    }).where(and(eq(calendarItems.id, task.calendarItemId), eq(calendarItems.ownerId, owner))).returning({ id: calendarItems.id });
    if (updated.length) return task.calendarItemId;
  }
  const [item] = await db.insert(calendarItems).values({
    ownerId: owner,
    title: task.title,
    kind: "task",
    description: task.description,
    scheduledDate: task.dueDate,
    categoryId: category.id,
  }).returning({ id: calendarItems.id });
  return item.id;
}

function refresh() {
  revalidatePath("/kanban");
  revalidatePath("/calendar");
}

export async function createBoard(input: { name: string; color: string }) {
  const owner = await ownerId();
  const [board] = await db.insert(kanbanBoards).values({ ownerId: owner, name: nameValue(input.name, "Board name"), color: colorValue(input.color) }).returning();
  await db.insert(kanbanColumns).values(["Todo", "In Progress", "Done"].map((name, position) => ({ ownerId: owner, boardId: board.id, name, position })));
  refresh();
  return board.id;
}

export async function updateBoard(boardId: number, input: { name: string; color: string }) {
  const owner = await ownerId();
  await ownedBoard(owner, boardId);
  await db.update(kanbanBoards).set({ name: nameValue(input.name, "Board name"), color: colorValue(input.color), updatedAt: new Date() }).where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.ownerId, owner)));
  refresh();
}

export async function deleteBoard(boardId: number) {
  const owner = await ownerId();
  await ownedBoard(owner, boardId);
  const linked = await db.select({ id: kanbanTasks.calendarItemId }).from(kanbanTasks).where(and(eq(kanbanTasks.boardId, boardId), eq(kanbanTasks.ownerId, owner)));
  const ids = linked.flatMap((row) => row.id ? [row.id] : []);
  if (ids.length) await db.delete(calendarItems).where(and(eq(calendarItems.ownerId, owner), inArray(calendarItems.id, ids)));
  await db.delete(kanbanBoards).where(and(eq(kanbanBoards.id, boardId), eq(kanbanBoards.ownerId, owner)));
  refresh();
}

export async function createColumn(boardId: number, name: string) {
  const owner = await ownerId();
  await ownedBoard(owner, boardId);
  const columns = await db.select({ position: kanbanColumns.position }).from(kanbanColumns).where(and(eq(kanbanColumns.boardId, boardId), eq(kanbanColumns.ownerId, owner))).orderBy(asc(kanbanColumns.position));
  if (columns.length >= 5) throw new Error("A board can have up to 5 columns.");
  await db.insert(kanbanColumns).values({ ownerId: owner, boardId, name: nameValue(name, "Column name"), position: columns.length });
  refresh();
}

export async function updateColumn(columnId: number, name: string) {
  const owner = await ownerId();
  await ownedColumn(owner, columnId);
  await db.update(kanbanColumns).set({ name: nameValue(name, "Column name"), updatedAt: new Date() }).where(and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.ownerId, owner)));
  refresh();
}

export async function deleteColumn(columnId: number) {
  const owner = await ownerId();
  const column = await ownedColumn(owner, columnId);
  const tasks = await db.select({ id: kanbanTasks.id }).from(kanbanTasks).where(and(eq(kanbanTasks.columnId, columnId), eq(kanbanTasks.ownerId, owner))).limit(1);
  if (tasks.length) throw new Error("Move or delete every task before deleting this column.");
  await db.delete(kanbanColumns).where(and(eq(kanbanColumns.id, columnId), eq(kanbanColumns.ownerId, owner)));
  const siblings = await db.select().from(kanbanColumns).where(and(eq(kanbanColumns.boardId, column.boardId), eq(kanbanColumns.ownerId, owner))).orderBy(asc(kanbanColumns.position));
  await Promise.all(siblings.map((item, position) => db.update(kanbanColumns).set({ position }).where(eq(kanbanColumns.id, item.id))));
  refresh();
}

export async function createLabel(input: { name: string; color: string }) {
  const owner = await ownerId();
  const name = nameValue(input.name, "Label name").slice(0, 40);
  const [created] = await db.insert(taskCategories).values({ ownerId: owner, name, color: colorValue(input.color) }).onConflictDoNothing().returning();
  if (!created) throw new Error("A label with that name already exists.");
  refresh();
  return created;
}

type TaskInput = {
  title: string;
  description: string;
  dueDate: string;
  priority: "low" | "medium" | "high";
  labelIds: number[];
  calendarSynced: boolean;
  notesLinked: boolean;
};

export async function createTask(columnId: number, input: TaskInput) {
  const owner = await ownerId();
  const column = await ownedColumn(owner, columnId);
  const labels = await validateLabels(owner, input.labelIds);
  const values = taskValues(input);
  const positionRow = await db.select({ value: max(kanbanTasks.position) }).from(kanbanTasks).where(and(eq(kanbanTasks.columnId, columnId), eq(kanbanTasks.ownerId, owner)));
  const [task] = await db.insert(kanbanTasks).values({
    ownerId: owner, boardId: column.boardId, columnId, ...values, dueDate: input.dueDate,
    priority: input.priority, position: (positionRow[0]?.value ?? -1) + 1, notesLinked: input.notesLinked,
  }).returning();
  if (labels.length) await db.insert(kanbanTaskLabels).values(labels.map((label, position) => ({ taskId: task.id, categoryId: label.id, position })));
  const calendarItemId = await syncCalendar(owner, task, labels, input.calendarSynced);
  if (calendarItemId) await db.update(kanbanTasks).set({ calendarItemId }).where(eq(kanbanTasks.id, task.id));
  refresh();
}

export async function updateTask(taskId: number, input: TaskInput) {
  const owner = await ownerId();
  const current = await ownedTask(owner, taskId);
  const labels = await validateLabels(owner, input.labelIds);
  const values = taskValues(input);
  const [task] = await db.update(kanbanTasks).set({
    ...values, dueDate: input.dueDate, priority: input.priority, notesLinked: input.notesLinked, updatedAt: new Date(),
  }).where(and(eq(kanbanTasks.id, taskId), eq(kanbanTasks.ownerId, owner))).returning();
  await db.delete(kanbanTaskLabels).where(eq(kanbanTaskLabels.taskId, taskId));
  if (labels.length) await db.insert(kanbanTaskLabels).values(labels.map((label, position) => ({ taskId, categoryId: label.id, position })));
  const calendarItemId = await syncCalendar(owner, { ...task, calendarItemId: current.calendarItemId }, labels, input.calendarSynced);
  await db.update(kanbanTasks).set({ calendarItemId }).where(eq(kanbanTasks.id, taskId));
  refresh();
}

export async function deleteTask(taskId: number) {
  const owner = await ownerId();
  const task = await ownedTask(owner, taskId);
  if (task.calendarItemId) await db.delete(calendarItems).where(and(eq(calendarItems.id, task.calendarItemId), eq(calendarItems.ownerId, owner)));
  await db.delete(kanbanTasks).where(and(eq(kanbanTasks.id, taskId), eq(kanbanTasks.ownerId, owner)));
  refresh();
}

export async function reorderTasks(boardId: number, columns: { columnId: number; taskIds: number[] }[]) {
  const owner = await ownerId();
  await ownedBoard(owner, boardId);
  const ownedColumns = await db.select({ id: kanbanColumns.id }).from(kanbanColumns).where(and(eq(kanbanColumns.boardId, boardId), eq(kanbanColumns.ownerId, owner)));
  const validColumns = new Set(ownedColumns.map((column) => column.id));
  if (columns.some((column) => !validColumns.has(column.columnId))) throw new Error("Invalid task destination.");
  const suppliedIds = columns.flatMap((column) => column.taskIds);
  if (new Set(suppliedIds).size !== suppliedIds.length) throw new Error("Invalid task order.");
  const existing = await db.select({ id: kanbanTasks.id }).from(kanbanTasks).where(and(eq(kanbanTasks.boardId, boardId), eq(kanbanTasks.ownerId, owner)));
  if (existing.length !== suppliedIds.length || existing.some((task) => !suppliedIds.includes(task.id))) throw new Error("Task order is out of date. Refresh and try again.");
  await Promise.all(columns.flatMap((column) => column.taskIds.map((taskId, position) => db.update(kanbanTasks).set({ columnId: column.columnId, position, updatedAt: new Date() }).where(and(eq(kanbanTasks.id, taskId), eq(kanbanTasks.ownerId, owner))))));
  refresh();
}

"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calendarItems, db, kanbanTaskLabels, kanbanTasks, taskCategories } from "@/db";

const colorPattern = /^#[0-9a-fA-F]{6}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

async function ownerId() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in.");
  return userId;
}

async function linkedTask(owner: string, itemId: number) {
  return (await db.select().from(kanbanTasks).where(and(eq(kanbanTasks.calendarItemId, itemId), eq(kanbanTasks.ownerId, owner))).limit(1))[0];
}

async function syncLinkedTask(owner: string, itemId: number, input: { title: string; kind: "task" | "reminder"; description?: string; scheduledDate?: string | null; categoryId: number }) {
  const task = await linkedTask(owner, itemId);
  if (!task) return;
  if (!input.scheduledDate) throw new Error("Calendar-linked Kanban tasks must keep a due date.");
  if (input.kind !== "task") throw new Error("Calendar-linked Kanban items must remain tasks.");
  await db.update(kanbanTasks).set({
    title: input.title.trim(),
    description: input.description?.trim().slice(0, 1000) || null,
    dueDate: input.scheduledDate,
    updatedAt: new Date(),
  }).where(and(eq(kanbanTasks.id, task.id), eq(kanbanTasks.ownerId, owner)));

  const current = await db.select().from(kanbanTaskLabels).where(eq(kanbanTaskLabels.taskId, task.id)).orderBy(asc(kanbanTaskLabels.position));
  const remaining = current.slice(1).filter((label) => label.categoryId !== input.categoryId);
  await db.delete(kanbanTaskLabels).where(eq(kanbanTaskLabels.taskId, task.id));
  await db.insert(kanbanTaskLabels).values([
    { taskId: task.id, categoryId: input.categoryId, position: 0 },
    ...remaining.map((label, index) => ({ taskId: task.id, categoryId: label.categoryId, position: index + 1 })),
  ]);
}

export async function createCalendarItem(input: {
  title: string;
  kind: "task" | "reminder";
  description?: string;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  categoryId?: number;
  categoryName?: string;
  categoryColor?: string;
}) {
  const owner = await ownerId();
  const title = input.title.trim();
  if (!title || title.length > 140) throw new Error("Enter a title under 140 characters.");
  if (!["task", "reminder"].includes(input.kind)) throw new Error("Invalid item type.");
  if (input.scheduledDate && !datePattern.test(input.scheduledDate)) throw new Error("Invalid date.");
  if (input.scheduledTime && !timePattern.test(input.scheduledTime)) throw new Error("Invalid time.");

  let categoryId = input.categoryId;
  if (input.categoryName) {
    const name = input.categoryName.trim().slice(0, 40);
    const color = input.categoryColor ?? "";
    if (!name || !colorPattern.test(color)) throw new Error("Invalid category.");
    const [created] = await db.insert(taskCategories).values({ ownerId: owner, name, color }).onConflictDoNothing().returning();
    if (created) categoryId = created.id;
    else categoryId = (await db.select().from(taskCategories).where(and(eq(taskCategories.ownerId, owner), eq(taskCategories.name, name))).limit(1))[0]?.id;
  }
  if (!categoryId) throw new Error("Choose a category.");
  const category = await db.select().from(taskCategories).where(and(eq(taskCategories.id, categoryId), eq(taskCategories.ownerId, owner))).limit(1);
  if (!category.length) throw new Error("Invalid category.");

  await db.insert(calendarItems).values({
    ownerId: owner,
    title,
    kind: input.kind,
    description: input.description?.trim().slice(0, 1000) || null,
    scheduledDate: input.scheduledDate || null,
    scheduledTime: input.scheduledTime ? `${input.scheduledTime}:00` : null,
    categoryId,
  });
  revalidatePath("/calendar");
}

export async function updateCalendarItem(itemId: number, input: {
  title: string;
  kind: "task" | "reminder";
  description?: string;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  categoryId: number;
}) {
  const owner = await ownerId();
  const title = input.title.trim();
  if (!title || title.length > 140) throw new Error("Enter a title under 140 characters.");
  if (!["task", "reminder"].includes(input.kind)) throw new Error("Invalid item type.");
  if (input.scheduledDate && !datePattern.test(input.scheduledDate)) throw new Error("Invalid date.");
  if (input.scheduledTime && !timePattern.test(input.scheduledTime)) throw new Error("Invalid time.");

  const category = await db.select().from(taskCategories).where(and(eq(taskCategories.id, input.categoryId), eq(taskCategories.ownerId, owner))).limit(1);
  if (!category.length) throw new Error("Invalid category.");
  await syncLinkedTask(owner, itemId, input);

  const result = await db.update(calendarItems).set({
    title,
    kind: input.kind,
    description: input.description?.trim().slice(0, 1000) || null,
    scheduledDate: input.scheduledDate || null,
    scheduledTime: input.scheduledTime ? `${input.scheduledTime}:00` : null,
    categoryId: input.categoryId,
    updatedAt: new Date(),
  }).where(and(eq(calendarItems.id, itemId), eq(calendarItems.ownerId, owner))).returning({ id: calendarItems.id });
  if (!result.length) throw new Error("Item not found.");
  revalidatePath("/calendar");
  revalidatePath("/kanban");
}

export async function rescheduleCalendarItem(itemId: number, scheduledDate: string | null) {
  const owner = await ownerId();
  if (scheduledDate && !datePattern.test(scheduledDate)) throw new Error("Invalid date.");
  const task = await linkedTask(owner, itemId);
  if (task && !scheduledDate) throw new Error("Calendar-linked Kanban tasks must keep a due date.");
  const result = await db.update(calendarItems).set({ scheduledDate, updatedAt: new Date() }).where(and(eq(calendarItems.id, itemId), eq(calendarItems.ownerId, owner))).returning({ id: calendarItems.id });
  if (!result.length) throw new Error("Item not found.");
  if (task && scheduledDate) await db.update(kanbanTasks).set({ dueDate: scheduledDate, updatedAt: new Date() }).where(and(eq(kanbanTasks.id, task.id), eq(kanbanTasks.ownerId, owner)));
  revalidatePath("/calendar");
  revalidatePath("/kanban");
}

export async function deleteCalendarItem(itemId: number) {
  const owner = await ownerId();
  const task = await linkedTask(owner, itemId);
  if (task) await db.update(kanbanTasks).set({ calendarItemId: null, updatedAt: new Date() }).where(and(eq(kanbanTasks.id, task.id), eq(kanbanTasks.ownerId, owner)));
  const result = await db.delete(calendarItems).where(and(eq(calendarItems.id, itemId), eq(calendarItems.ownerId, owner))).returning({ id: calendarItems.id });
  if (!result.length) throw new Error("Item not found.");
  revalidatePath("/calendar");
  revalidatePath("/kanban");
}

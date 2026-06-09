"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calendarItems, db, taskCategories } from "@/db";

const colorPattern = /^#[0-9a-fA-F]{6}$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

async function ownerId() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in.");
  return userId;
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
}

export async function rescheduleCalendarItem(itemId: number, scheduledDate: string | null) {
  const owner = await ownerId();
  if (scheduledDate && !datePattern.test(scheduledDate)) throw new Error("Invalid date.");
  const result = await db.update(calendarItems).set({ scheduledDate, updatedAt: new Date() }).where(and(eq(calendarItems.id, itemId), eq(calendarItems.ownerId, owner))).returning({ id: calendarItems.id });
  if (!result.length) throw new Error("Item not found.");
  revalidatePath("/calendar");
}

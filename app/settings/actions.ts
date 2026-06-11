"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calendarItems, db, kanbanTaskLabels, notes, taskCategories, userSettings } from "@/db";
import { currentOwnerId, getUserSettings } from "@/lib/settings";
import { aiBehaviors, aiModels, aiTones, categoryIcons, categoryScopes } from "@/lib/settings-options";

const colorPattern = /^#[0-9a-fA-F]{6}$/;
const themes = ["system", "light", "dark"] as const;
const views = ["month", "week"] as const;
const priorities = ["low", "medium", "high"] as const;

function oneOf<T extends readonly string[]>(value: unknown, values: T, label: string): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw new Error(`Choose a valid ${label}.`);
  return value as T[number];
}

export async function updatePreferences(input: {
  theme: string;
  notifyReminders: boolean;
  notifyDailySummary: boolean;
  notifyCollaboration: boolean;
  defaultCalendarView: string;
  defaultTaskPriority: string;
  noteAutoSave: boolean;
  aiModel: string;
  aiBehavior: string;
  aiTone: string;
  aiRefineEnabled: boolean;
  aiDiagramEnabled: boolean;
  aiProcessingEnabled: boolean;
}) {
  const ownerId = await currentOwnerId();
  await getUserSettings(ownerId);
  await db.update(userSettings).set({
    theme: oneOf(input.theme, themes, "theme"),
    notifyReminders: Boolean(input.notifyReminders),
    notifyDailySummary: Boolean(input.notifyDailySummary),
    notifyCollaboration: Boolean(input.notifyCollaboration),
    defaultCalendarView: oneOf(input.defaultCalendarView, views, "calendar view"),
    defaultTaskPriority: oneOf(input.defaultTaskPriority, priorities, "task priority"),
    noteAutoSave: Boolean(input.noteAutoSave),
    aiModel: oneOf(input.aiModel, aiModels, "AI model"),
    aiBehavior: oneOf(input.aiBehavior, aiBehaviors, "AI behavior"),
    aiTone: oneOf(input.aiTone, aiTones, "AI tone"),
    aiRefineEnabled: Boolean(input.aiRefineEnabled),
    aiDiagramEnabled: Boolean(input.aiDiagramEnabled),
    aiProcessingEnabled: Boolean(input.aiProcessingEnabled),
    updatedAt: new Date(),
  }).where(eq(userSettings.ownerId, ownerId));
  revalidatePath("/", "layout");
}

function categoryValues(input: { name: string; color: string; scope: string; icon: string }) {
  const name = input.name.trim();
  if (!name || name.length > 40) throw new Error("Category names must be between 1 and 40 characters.");
  if (!colorPattern.test(input.color)) throw new Error("Choose a valid category color.");
  return {
    name,
    color: input.color,
    scope: oneOf(input.scope, categoryScopes, "category area"),
    icon: oneOf(input.icon, categoryIcons, "category icon"),
  };
}

export async function createCategory(input: { name: string; color: string; scope: string; icon: string }) {
  const ownerId = await currentOwnerId();
  const [created] = await db.insert(taskCategories).values({ ownerId, ...categoryValues(input) }).onConflictDoNothing().returning();
  if (!created) throw new Error("A category with that name already exists in this area.");
  revalidatePath("/", "layout");
  return created;
}

export async function updateCategory(categoryId: number, input: { name: string; color: string; scope: string; icon: string }) {
  const ownerId = await currentOwnerId();
  const current = (await db.select().from(taskCategories).where(and(eq(taskCategories.id, categoryId), eq(taskCategories.ownerId, ownerId))).limit(1))[0];
  if (!current) throw new Error("Category not found.");
  const values = categoryValues(input);
  if (values.scope !== current.scope) throw new Error("Move between category areas is not supported.");
  const result = await db.update(taskCategories).set(values).where(and(eq(taskCategories.id, categoryId), eq(taskCategories.ownerId, ownerId))).returning();
  if (!result.length) throw new Error("Category not found.");
  revalidatePath("/", "layout");
}

export async function deleteCategory(categoryId: number) {
  const ownerId = await currentOwnerId();
  const category = (await db.select().from(taskCategories).where(and(eq(taskCategories.id, categoryId), eq(taskCategories.ownerId, ownerId))).limit(1))[0];
  if (!category) throw new Error("Category not found.");
  const [calendarUse, labelUse, noteUse] = await Promise.all([
    db.select({ id: calendarItems.id }).from(calendarItems).where(and(eq(calendarItems.ownerId, ownerId), eq(calendarItems.categoryId, categoryId))).limit(1),
    db.select({ id: kanbanTaskLabels.taskId }).from(kanbanTaskLabels).where(eq(kanbanTaskLabels.categoryId, categoryId)).limit(1),
    db.select({ id: notes.id }).from(notes).where(and(eq(notes.ownerId, ownerId), eq(notes.categoryId, categoryId))).limit(1),
  ]);
  if (calendarUse.length || labelUse.length || noteUse.length) throw new Error("This category is in use. Reassign its items before deleting it.");
  await db.delete(taskCategories).where(and(eq(taskCategories.id, categoryId), eq(taskCategories.ownerId, ownerId)));
  revalidatePath("/", "layout");
}

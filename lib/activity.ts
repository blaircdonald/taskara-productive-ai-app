import "server-only";

import { and, desc, eq, gt } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assistantThreads, calendarItems, db, kanbanBoards, kanbanTasks, notes, pages, userActivity, whiteboards } from "@/db";

type ActivityInput = {
  actorId: string;
  feature: "calendar" | "kanban" | "notes" | "whiteboard" | "spaces" | "assistant";
  action: "created" | "updated" | "generated" | "completed";
  entityType: string;
  entityId: number | string;
  title: string;
  href?: string;
  metadata?: Record<string, unknown>;
  coalesce?: boolean;
};

export async function recordActivity(input: ActivityInput) {
  const entityId = String(input.entityId);
  const title = input.title.trim().slice(0, 180) || "Untitled";
  if (input.coalesce) {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000);
    const existing = (await db.select({ id: userActivity.id }).from(userActivity).where(and(
      eq(userActivity.actorId, input.actorId),
      eq(userActivity.action, input.action),
      eq(userActivity.entityType, input.entityType),
      eq(userActivity.entityId, entityId),
      gt(userActivity.createdAt, cutoff),
    )).orderBy(desc(userActivity.createdAt)).limit(1))[0];
    if (existing) {
      await db.update(userActivity).set({ title, href: input.href, metadata: input.metadata ?? {}, createdAt: new Date() }).where(eq(userActivity.id, existing.id));
      revalidatePath("/");
      return;
    }
  }
  await db.insert(userActivity).values({
    actorId: input.actorId,
    feature: input.feature,
    action: input.action,
    entityType: input.entityType,
    entityId,
    title,
    href: input.href,
    metadata: input.metadata ?? {},
  });
  revalidatePath("/");
}

export async function seedInitialActivity(actorId: string) {
  const exists = (await db.select({ id: userActivity.id }).from(userActivity).where(eq(userActivity.actorId, actorId)).limit(1))[0];
  if (exists) return;
  const [calendarRows, taskRows, noteRows, boardRows, whiteboardRows, pageRows, threadRows] = await Promise.all([
    db.select().from(calendarItems).where(eq(calendarItems.ownerId, actorId)),
    db.select().from(kanbanTasks).where(eq(kanbanTasks.ownerId, actorId)),
    db.select().from(notes).where(eq(notes.ownerId, actorId)),
    db.select().from(kanbanBoards).where(eq(kanbanBoards.ownerId, actorId)),
    db.select().from(whiteboards).where(eq(whiteboards.ownerId, actorId)),
    db.select().from(pages).where(eq(pages.updatedBy, actorId)),
    db.select().from(assistantThreads).where(eq(assistantThreads.ownerId, actorId)),
  ]);
  const rows = [
    ...calendarRows.map((item) => ({ actorId, feature: "calendar", action: "created", entityType: item.kind, entityId: String(item.id), title: item.title, href: "/calendar", createdAt: item.createdAt })),
    ...taskRows.map((item) => ({ actorId, feature: "kanban", action: "created", entityType: "task", entityId: String(item.id), title: item.title, href: `/kanban?board=${item.boardId}`, createdAt: item.createdAt })),
    ...noteRows.map((item) => ({ actorId, feature: "notes", action: "updated", entityType: "note", entityId: String(item.id), title: item.title, href: `/notes?note=${item.id}`, createdAt: item.updatedAt })),
    ...boardRows.map((item) => ({ actorId, feature: "kanban", action: "created", entityType: "board", entityId: String(item.id), title: item.name, href: `/kanban?board=${item.id}`, createdAt: item.createdAt })),
    ...whiteboardRows.map((item) => ({ actorId, feature: "whiteboard", action: "updated", entityType: "whiteboard", entityId: String(item.id), title: item.name, href: `/whiteboard?board=${item.id}`, createdAt: item.updatedAt })),
    ...pageRows.map((item) => ({ actorId, feature: "spaces", action: item.createdBy === actorId ? "created" : "updated", entityType: "page", entityId: String(item.id), title: item.name, href: `/spaces/${item.spaceId}/pages/${item.id}`, createdAt: item.updatedAt })),
    ...threadRows.map((item) => ({ actorId, feature: "assistant", action: "updated", entityType: "assistant-thread", entityId: String(item.id), title: item.title, href: "/assistant", createdAt: item.updatedAt })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 80);
  if (rows.length) await db.insert(userActivity).values(rows.map((row) => ({ ...row, metadata: {} })));
}

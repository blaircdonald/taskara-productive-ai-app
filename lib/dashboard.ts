import "server-only";

import { and, asc, count, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  assistantActionRequests, assistantThreads, calendarItems, db, kanbanBoards, kanbanColumns, kanbanTasks,
  notes, pages, spaces, taskCategories, userActivity, whiteboards,
} from "@/db";
import { accessibleBoards, currentActor } from "@/lib/kanban-access";
import { accessibleSpaces } from "@/lib/spaces-access";
import { getUserSettings } from "@/lib/settings";
import { seedInitialActivity } from "@/lib/activity";

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export async function getDashboardData() {
  const actor = await currentActor();
  await seedInitialActivity(actor.clerkId);
  const [boardRows, spaceRows, settings] = await Promise.all([accessibleBoards(actor), accessibleSpaces(actor), getUserSettings(actor.clerkId)]);
  const boardIds = boardRows.map((board) => board.id);
  const spaceList = spaceRows.map((row) => row.spaces).filter((space) => !space.archivedAt);
  const spaceIds = spaceList.map((space) => space.id);

  const [taskRows, columnRows, calendarRows, noteRows, whiteboardRows, pageRows, activities, calendarTotal, noteTotal, whiteboardTotal, threadTotal, actionTotal] = await Promise.all([
    boardIds.length ? db.select().from(kanbanTasks).where(inArray(kanbanTasks.boardId, boardIds)) : [],
    boardIds.length ? db.select().from(kanbanColumns).where(inArray(kanbanColumns.boardId, boardIds)).orderBy(asc(kanbanColumns.position)) : [],
    db.select({
      id: calendarItems.id, title: calendarItems.title, kind: calendarItems.kind, scheduledDate: calendarItems.scheduledDate,
      scheduledTime: calendarItems.scheduledTime, categoryColor: taskCategories.color, categoryName: taskCategories.name,
    }).from(calendarItems).innerJoin(taskCategories, and(eq(calendarItems.categoryId, taskCategories.id), eq(taskCategories.ownerId, actor.clerkId)))
      .where(eq(calendarItems.ownerId, actor.clerkId)).orderBy(asc(calendarItems.scheduledDate), asc(calendarItems.scheduledTime)),
    db.select().from(notes).where(and(eq(notes.ownerId, actor.clerkId), isNull(notes.trashedAt))).orderBy(desc(notes.updatedAt)).limit(20),
    db.select().from(whiteboards).where(eq(whiteboards.ownerId, actor.clerkId)).orderBy(desc(whiteboards.updatedAt)).limit(20),
    spaceIds.length ? db.select().from(pages).where(and(inArray(pages.spaceId, spaceIds), isNull(pages.archivedAt))).orderBy(desc(pages.updatedAt)).limit(30) : [],
    db.select().from(userActivity).where(eq(userActivity.actorId, actor.clerkId)).orderBy(desc(userActivity.createdAt)).limit(12),
    db.select({ value: count() }).from(calendarItems).where(eq(calendarItems.ownerId, actor.clerkId)),
    db.select({ value: count() }).from(notes).where(and(eq(notes.ownerId, actor.clerkId), isNull(notes.trashedAt))),
    db.select({ value: count() }).from(whiteboards).where(eq(whiteboards.ownerId, actor.clerkId)),
    db.select({ value: count() }).from(assistantThreads).where(eq(assistantThreads.ownerId, actor.clerkId)),
    db.select({ value: count() }).from(assistantActionRequests).where(eq(assistantActionRequests.ownerId, actor.clerkId)),
  ]);

  const finalColumnIds = new Set(boardRows.flatMap((board) => {
    const columns = columnRows.filter((column) => column.boardId === board.id);
    return columns.length ? [columns[columns.length - 1].id] : [];
  }));
  const recentWork = [
    ...noteRows.map((item) => ({ type: "Note", id: item.id, title: item.title, color: item.color, href: `/notes?note=${item.id}`, updatedAt: item.updatedAt })),
    ...whiteboardRows.map((item) => ({ type: "Whiteboard", id: item.id, title: item.name, color: item.color, href: `/whiteboard?board=${item.id}`, updatedAt: item.updatedAt })),
    ...boardRows.map((item) => ({ type: "Kanban board", id: item.id, title: item.name, color: item.color, href: `/kanban?board=${item.id}`, updatedAt: item.updatedAt })),
    ...pageRows.map((item) => ({ type: "Page", id: item.id, title: item.name, color: spaceList.find((space) => space.id === item.spaceId)?.color ?? "#7c3aed", href: `/spaces/${item.spaceId}/pages/${item.id}`, updatedAt: item.updatedAt })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()).slice(0, 8);

  return {
    user: { name: actor.name, firstName: actor.name.split(" ")[0] || "there" },
    aiStatus: !settings.aiProcessingEnabled ? "disabled" as const : process.env.GEMINI_API_KEY ? "ready" as const : "setup-required" as const,
    counts: {
      calendar: calendarTotal[0]?.value ?? 0, boards: boardRows.length, tasks: taskRows.length, notes: noteTotal[0]?.value ?? 0,
      whiteboards: whiteboardTotal[0]?.value ?? 0, threads: threadTotal[0]?.value ?? 0, assistantActions: actionTotal[0]?.value ?? 0,
    },
    tasks: taskRows.map((task) => ({ id: task.id, title: task.title, dueDate: task.dueDate, priority: task.priority, completed: finalColumnIds.has(task.columnId) })),
    calendar: calendarRows,
    recentWork: recentWork.map((item) => ({ ...item, updatedAt: item.updatedAt.toISOString() })),
    activity: activities.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() })),
  };
}

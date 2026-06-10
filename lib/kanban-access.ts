import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { and, eq, or } from "drizzle-orm";
import { db, kanbanBoardMembers, kanbanBoards, kanbanColumns, kanbanTasks } from "@/db";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const roomIdForBoard = (boardId: number) => `kanban-board:${boardId}`;

export async function currentActor() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  if (!user || !email) throw new Error("You must be signed in.");
  return {
    clerkId: user.id,
    email: normalizeEmail(email),
    name: user.fullName || [user.firstName, user.lastName].filter(Boolean).join(" ") || email,
    avatar: user.imageUrl,
  };
}

export async function accessibleBoards(actor: Awaited<ReturnType<typeof currentActor>>) {
  return db.selectDistinct({
    id: kanbanBoards.id,
    ownerId: kanbanBoards.ownerId,
    name: kanbanBoards.name,
    color: kanbanBoards.color,
    createdAt: kanbanBoards.createdAt,
    updatedAt: kanbanBoards.updatedAt,
  }).from(kanbanBoards).leftJoin(kanbanBoardMembers, eq(kanbanBoardMembers.boardId, kanbanBoards.id))
    .where(or(eq(kanbanBoards.ownerId, actor.clerkId), eq(kanbanBoardMembers.email, actor.email)));
}

export async function accessibleBoard(actor: Awaited<ReturnType<typeof currentActor>>, boardId: number) {
  const board = (await db.selectDistinct().from(kanbanBoards)
    .leftJoin(kanbanBoardMembers, eq(kanbanBoardMembers.boardId, kanbanBoards.id))
    .where(and(eq(kanbanBoards.id, boardId), or(eq(kanbanBoards.ownerId, actor.clerkId), eq(kanbanBoardMembers.email, actor.email))))
    .limit(1))[0]?.kanban_boards;
  if (!board) throw new Error("Board not found.");
  return { ...board, isOwner: board.ownerId === actor.clerkId };
}

export async function ownerBoard(actor: Awaited<ReturnType<typeof currentActor>>, boardId: number) {
  const board = await accessibleBoard(actor, boardId);
  if (!board.isOwner) throw new Error("Only the board owner can do that.");
  return board;
}

export async function accessibleColumn(actor: Awaited<ReturnType<typeof currentActor>>, columnId: number) {
  const column = (await db.select().from(kanbanColumns).where(eq(kanbanColumns.id, columnId)).limit(1))[0];
  if (!column) throw new Error("Column not found.");
  const board = await accessibleBoard(actor, column.boardId);
  return { column, board };
}

export async function accessibleTask(actor: Awaited<ReturnType<typeof currentActor>>, taskId: number) {
  const task = (await db.select().from(kanbanTasks).where(eq(kanbanTasks.id, taskId)).limit(1))[0];
  if (!task) throw new Error("Task not found.");
  const board = await accessibleBoard(actor, task.boardId);
  return { task, board };
}

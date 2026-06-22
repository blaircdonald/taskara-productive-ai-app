"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, whiteboards } from "@/db";
import { recordActivity } from "@/lib/activity";

const colorPattern = /^#[0-9a-fA-F]{6}$/;

async function ownerId() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in.");
  return userId;
}

function validName(value: string) {
  const name = value.trim() || "Untitled whiteboard";
  if (name.length > 120) throw new Error("Whiteboard names must be under 120 characters.");
  return name;
}

function validColor(value: string) {
  if (!colorPattern.test(value)) throw new Error("Choose a valid whiteboard color.");
  return value;
}

function validScene(input: { elements: unknown; appState: unknown; files: unknown }) {
  if (!Array.isArray(input.elements)) throw new Error("The whiteboard elements are invalid.");
  if (!input.appState || typeof input.appState !== "object" || Array.isArray(input.appState)) throw new Error("The whiteboard settings are invalid.");
  if (!input.files || typeof input.files !== "object" || Array.isArray(input.files)) throw new Error("The whiteboard files are invalid.");
  return input;
}

const refresh = () => revalidatePath("/whiteboard");

export async function createWhiteboard() {
  const owner = await ownerId();
  const [board] = await db.insert(whiteboards).values({ ownerId: owner }).returning({ id: whiteboards.id });
  await recordActivity({ actorId: owner, feature: "whiteboard", action: "created", entityType: "whiteboard", entityId: board.id, title: "Untitled whiteboard", href: `/whiteboard?board=${board.id}` });
  refresh();
  return board.id;
}

export async function renameWhiteboard(boardId: number, name: string) {
  const owner = await ownerId();
  const result = await db.update(whiteboards).set({ name: validName(name), updatedAt: new Date() })
    .where(and(eq(whiteboards.id, boardId), eq(whiteboards.ownerId, owner))).returning({ id: whiteboards.id });
  if (!result.length) throw new Error("Whiteboard not found.");
  const board = (await db.select({ name: whiteboards.name }).from(whiteboards).where(and(eq(whiteboards.id, boardId), eq(whiteboards.ownerId, owner))).limit(1))[0];
  if (board) await recordActivity({ actorId: owner, feature: "whiteboard", action: "updated", entityType: "whiteboard", entityId: boardId, title: board.name, href: `/whiteboard?board=${boardId}`, coalesce: true });
  refresh();
}

export async function updateWhiteboardColor(boardId: number, color: string) {
  const owner = await ownerId();
  const result = await db.update(whiteboards).set({ color: validColor(color), updatedAt: new Date() })
    .where(and(eq(whiteboards.id, boardId), eq(whiteboards.ownerId, owner))).returning({ id: whiteboards.id });
  if (!result.length) throw new Error("Whiteboard not found.");
  refresh();
}

export async function saveWhiteboard(boardId: number, input: { elements: unknown; appState: unknown; files: unknown }) {
  const owner = await ownerId();
  const scene = validScene(input);
  const result = await db.update(whiteboards).set({ ...scene, updatedAt: new Date() })
    .where(and(eq(whiteboards.id, boardId), eq(whiteboards.ownerId, owner))).returning({ id: whiteboards.id });
  if (!result.length) throw new Error("Whiteboard not found.");
  const board = (await db.select({ name: whiteboards.name }).from(whiteboards).where(and(eq(whiteboards.id, boardId), eq(whiteboards.ownerId, owner))).limit(1))[0];
  if (board) await recordActivity({ actorId: owner, feature: "whiteboard", action: "updated", entityType: "whiteboard", entityId: boardId, title: board.name, href: `/whiteboard?board=${boardId}`, coalesce: true });
}

export async function clearWhiteboard(boardId: number) {
  const owner = await ownerId();
  const result = await db.update(whiteboards).set({ elements: [], files: {}, updatedAt: new Date() })
    .where(and(eq(whiteboards.id, boardId), eq(whiteboards.ownerId, owner))).returning({ id: whiteboards.id });
  if (!result.length) throw new Error("Whiteboard not found.");
  refresh();
}

export async function deleteWhiteboard(boardId: number) {
  const owner = await ownerId();
  const result = await db.delete(whiteboards).where(and(eq(whiteboards.id, boardId), eq(whiteboards.ownerId, owner))).returning({ id: whiteboards.id });
  if (!result.length) throw new Error("Whiteboard not found.");
  refresh();
}

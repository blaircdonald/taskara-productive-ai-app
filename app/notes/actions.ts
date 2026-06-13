"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, notes, taskCategories } from "@/db";
import { recordActivity } from "@/lib/activity";

const colorPattern = /^#[0-9a-fA-F]{6}$/;
const emptyDocument = { type: "doc", content: [{ type: "paragraph" }] };

async function ownerId() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in.");
  return userId;
}

function validTitle(value: string) {
  const title = value.trim() || "Untitled note";
  if (title.length > 160) throw new Error("Note titles must be under 160 characters.");
  return title;
}

function validColor(value: string) {
  if (!colorPattern.test(value)) throw new Error("Choose a valid note color.");
  return value;
}

const refresh = () => revalidatePath("/notes");

export async function createNote() {
  const owner = await ownerId();
  const [note] = await db.insert(notes).values({ ownerId: owner, content: emptyDocument }).returning({ id: notes.id });
  await recordActivity({ actorId: owner, feature: "notes", action: "created", entityType: "note", entityId: note.id, title: "Untitled note", href: `/notes?note=${note.id}` });
  refresh();
  return note.id;
}

export async function saveNote(noteId: number, input: { title: string; content: unknown }) {
  const owner = await ownerId();
  if (!input.content || typeof input.content !== "object") throw new Error("The note content is invalid.");
  const result = await db.update(notes).set({ title: validTitle(input.title), content: input.content, updatedAt: new Date() }).where(and(eq(notes.id, noteId), eq(notes.ownerId, owner), isNull(notes.trashedAt))).returning({ id: notes.id });
  if (!result.length) throw new Error("Note not found.");
  await recordActivity({ actorId: owner, feature: "notes", action: "updated", entityType: "note", entityId: noteId, title: validTitle(input.title), href: `/notes?note=${noteId}`, coalesce: true });
}

export async function renameNote(noteId: number, title: string) {
  const owner = await ownerId();
  const result = await db.update(notes).set({ title: validTitle(title), updatedAt: new Date() }).where(and(eq(notes.id, noteId), eq(notes.ownerId, owner), isNull(notes.trashedAt))).returning({ id: notes.id });
  if (!result.length) throw new Error("Note not found.");
  refresh();
}

export async function duplicateNote(noteId: number) {
  const owner = await ownerId();
  const source = (await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.ownerId, owner), isNull(notes.trashedAt))).limit(1))[0];
  if (!source) throw new Error("Note not found.");
  const [copy] = await db.insert(notes).values({ ownerId: owner, title: `${source.title} copy`.slice(0, 160), content: source.content, color: source.color }).returning({ id: notes.id });
  refresh();
  return copy.id;
}

export async function updateNoteColor(noteId: number, color: string) {
  const owner = await ownerId();
  const result = await db.update(notes).set({ color: validColor(color), updatedAt: new Date() }).where(and(eq(notes.id, noteId), eq(notes.ownerId, owner), isNull(notes.trashedAt))).returning({ id: notes.id });
  if (!result.length) throw new Error("Note not found.");
  refresh();
}

export async function setNoteCategory(noteId: number, categoryId: number | null) {
  const owner = await ownerId();
  if (categoryId) {
    const category = await db.select().from(taskCategories).where(and(eq(taskCategories.id, categoryId), eq(taskCategories.ownerId, owner), eq(taskCategories.scope, "notes"))).limit(1);
    if (!category.length) throw new Error("Invalid note category.");
  }
  const result = await db.update(notes).set({ categoryId, updatedAt: new Date() }).where(and(eq(notes.id, noteId), eq(notes.ownerId, owner), isNull(notes.trashedAt))).returning({ id: notes.id });
  if (!result.length) throw new Error("Note not found.");
  refresh();
}

export async function setNotePinned(noteId: number, pinned: boolean) {
  const owner = await ownerId();
  const result = await db.update(notes).set({ isPinned: pinned, updatedAt: new Date() }).where(and(eq(notes.id, noteId), eq(notes.ownerId, owner), isNull(notes.trashedAt))).returning({ id: notes.id });
  if (!result.length) throw new Error("Note not found.");
  refresh();
}

export async function trashNote(noteId: number) {
  const owner = await ownerId();
  const result = await db.update(notes).set({ trashedAt: new Date(), isPinned: false, updatedAt: new Date() }).where(and(eq(notes.id, noteId), eq(notes.ownerId, owner), isNull(notes.trashedAt))).returning({ id: notes.id });
  if (!result.length) throw new Error("Note not found.");
  refresh();
}

export async function restoreNote(noteId: number) {
  const owner = await ownerId();
  const result = await db.update(notes).set({ trashedAt: null, updatedAt: new Date() }).where(and(eq(notes.id, noteId), eq(notes.ownerId, owner), isNotNull(notes.trashedAt))).returning({ id: notes.id });
  if (!result.length) throw new Error("Note not found.");
  refresh();
}

export async function permanentlyDeleteNote(noteId: number) {
  const owner = await ownerId();
  const result = await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.ownerId, owner), isNotNull(notes.trashedAt))).returning({ id: notes.id });
  if (!result.length) throw new Error("Note not found.");
  refresh();
}

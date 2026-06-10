import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db, notes } from "@/db";
import { NotesWorkspace } from "./notes-workspace";

export default async function NotesPage({ searchParams }: { searchParams: Promise<{ note?: string; trash?: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const params = await searchParams;
  const summaries = await db.select({
    id: notes.id, title: notes.title, color: notes.color, isPinned: notes.isPinned,
    trashedAt: notes.trashedAt, updatedAt: notes.updatedAt,
  }).from(notes).where(and(eq(notes.ownerId, userId), isNull(notes.trashedAt))).orderBy(desc(notes.isPinned), desc(notes.updatedAt));
  const trash = await db.select({
    id: notes.id, title: notes.title, color: notes.color, isPinned: notes.isPinned,
    trashedAt: notes.trashedAt, updatedAt: notes.updatedAt,
  }).from(notes).where(and(eq(notes.ownerId, userId), isNotNull(notes.trashedAt))).orderBy(desc(notes.trashedAt));
  const requested = Number(params.note);
  const selectedId = summaries.some((note) => note.id === requested) ? requested : summaries[0]?.id;
  const selected = selectedId ? (await db.select().from(notes).where(and(eq(notes.ownerId, userId), eq(notes.id, selectedId), isNull(notes.trashedAt))).limit(1))[0] : null;
  const serialize = <T extends { updatedAt: Date; trashedAt: Date | null }>(note: T) => ({ ...note, updatedAt: note.updatedAt.toISOString(), trashedAt: note.trashedAt?.toISOString() ?? null });
  return <AppShell><NotesWorkspace notes={summaries.map(serialize)} trash={trash.map(serialize)} selected={selected ? serialize(selected) : null} trashOpen={params.trash === "1"} /></AppShell>;
}

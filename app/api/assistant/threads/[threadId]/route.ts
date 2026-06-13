import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { assistantActionRequests, assistantMessages, assistantThreads, db } from "@/db";
import { ownedThread } from "@/lib/assistant";

export async function GET(_: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const threadId = Number((await params).threadId);
  try {
    const thread = await ownedThread(userId, threadId);
    const [messages, actions] = await Promise.all([
      db.select().from(assistantMessages).where(and(eq(assistantMessages.ownerId, userId), eq(assistantMessages.threadId, threadId))).orderBy(asc(assistantMessages.createdAt)),
      db.select().from(assistantActionRequests).where(and(eq(assistantActionRequests.ownerId, userId), eq(assistantActionRequests.threadId, threadId))).orderBy(asc(assistantActionRequests.createdAt)),
    ]);
    return NextResponse.json({ thread, messages, actions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Conversation not found." }, { status: 404 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const threadId = Number((await params).threadId);
  await ownedThread(userId, threadId);
  const body = await request.json();
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 80) : "";
  if (!title) return NextResponse.json({ error: "Enter a conversation title." }, { status: 400 });
  const [thread] = await db.update(assistantThreads).set({ title, updatedAt: new Date() }).where(and(eq(assistantThreads.id, threadId), eq(assistantThreads.ownerId, userId))).returning();
  return NextResponse.json({ thread });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const threadId = Number((await params).threadId);
  const result = await db.delete(assistantThreads).where(and(eq(assistantThreads.id, threadId), eq(assistantThreads.ownerId, userId))).returning({ id: assistantThreads.id });
  if (!result.length) return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

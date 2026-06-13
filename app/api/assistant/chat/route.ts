import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { assistantThreads, db } from "@/db";
import { createAssistantThread, runAssistantChat, saveAssistantMessage } from "@/lib/assistant";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  try {
    const body = await request.json();
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 12000) : "";
    if (!message) return NextResponse.json({ error: "Enter a message." }, { status: 400 });
    const thread = Number(body.threadId) > 0 ? { id: Number(body.threadId) } : await createAssistantThread(userId, message.slice(0, 60));
    const userMessage = await saveAssistantMessage(userId, thread.id, "user", message);
    const current = (await db.select().from(assistantThreads).where(and(eq(assistantThreads.id, thread.id), eq(assistantThreads.ownerId, userId))).limit(1))[0];
    if (current?.title === "New conversation") await db.update(assistantThreads).set({ title: message.slice(0, 60), updatedAt: new Date() }).where(eq(assistantThreads.id, thread.id));
    const answer = await runAssistantChat(userId, thread.id, typeof body.timezone === "string" ? body.timezone : "UTC");
    const assistantMessage = await saveAssistantMessage(userId, thread.id, "assistant", answer.reply, "text", { results: answer.results });
    return NextResponse.json({ threadId: thread.id, userMessage, assistantMessage, results: answer.results });
  } catch (error) {
    console.error("Assistant chat failed", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI Assistant could not complete this request." }, { status: 500 });
  }
}

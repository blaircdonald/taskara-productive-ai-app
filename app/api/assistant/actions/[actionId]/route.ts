import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { resolveAssistantAction, saveAssistantMessage } from "@/lib/assistant";
import { assistantActionRequests, db } from "@/db";
import { and, eq } from "drizzle-orm";

export async function POST(request: Request, { params }: { params: Promise<{ actionId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  try {
    const body = await request.json();
    const decision = body.decision === "approve" ? "approve" : "reject";
    const actionId = Number((await params).actionId);
    const action = (await db.select().from(assistantActionRequests).where(and(eq(assistantActionRequests.id, actionId), eq(assistantActionRequests.ownerId, userId))).limit(1))[0];
    if (!action) throw new Error("Confirmation request not found.");
    const result = await resolveAssistantAction(userId, actionId, decision);
    const message = await saveAssistantMessage(userId, action.threadId, "assistant", decision === "approve" ? result.title : "Okay, I cancelled that action.", "text", { results: [result] });
    return NextResponse.json({ result, message });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not resolve this action." }, { status: 400 });
  }
}

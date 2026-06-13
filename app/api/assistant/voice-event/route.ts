import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { runAssistantAction, saveAssistantMessage } from "@/lib/assistant";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  try {
    const body = await request.json();
    const threadId = Number(body.threadId);
    if (body.type === "transcript") {
      const role = body.role === "assistant" ? "assistant" : "user";
      const message = await saveAssistantMessage(userId, threadId, role, String(body.text || "").slice(0, 12000), "voice");
      return NextResponse.json({ message });
    }
    if (body.type === "tool") {
      return NextResponse.json({ result: await runAssistantAction(userId, threadId, String(body.name || ""), body.arguments && typeof body.arguments === "object" ? body.arguments : {}) });
    }
    return NextResponse.json({ error: "Invalid voice event." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Voice action failed." }, { status: 400 });
  }
}

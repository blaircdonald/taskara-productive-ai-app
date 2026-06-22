import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { assistantThreads, db } from "@/db";
import { createAssistantThread } from "@/lib/assistant";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const threads = await db.select().from(assistantThreads).where(eq(assistantThreads.ownerId, userId)).orderBy(desc(assistantThreads.updatedAt));
  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  return NextResponse.json({ thread: await createAssistantThread(userId, typeof body.title === "string" ? body.title : undefined) });
}

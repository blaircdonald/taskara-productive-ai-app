import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { assistantThreads, db } from "@/db";
import { AssistantWorkspace } from "./assistant-workspace";

export default async function AssistantPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const threads = await db.select().from(assistantThreads).where(eq(assistantThreads.ownerId, userId)).orderBy(desc(assistantThreads.updatedAt));
  return <AppShell><AssistantWorkspace initialThreads={threads.map((thread) => ({ ...thread, createdAt: thread.createdAt.toISOString(), updatedAt: thread.updatedAt.toISOString() }))} /></AppShell>;
}

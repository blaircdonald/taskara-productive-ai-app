import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db, whiteboards } from "@/db";
import { WhiteboardWorkspace } from "./whiteboard-workspace";
import { getUserSettings } from "@/lib/settings";
import { createWhiteboard } from "./actions";

export default async function WhiteboardPage({ searchParams }: { searchParams: Promise<{ board?: string; create?: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const params = await searchParams;
  if (params.create === "1") redirect(`/whiteboard?board=${await createWhiteboard()}`);
  const settings = await getUserSettings(userId);
  const boards = await db.select({
    id: whiteboards.id,
    name: whiteboards.name,
    color: whiteboards.color,
    updatedAt: whiteboards.updatedAt,
  }).from(whiteboards).where(eq(whiteboards.ownerId, userId)).orderBy(desc(whiteboards.updatedAt));
  const requested = Number(params.board);
  const selectedId = boards.find((board) => board.id === requested)?.id ?? boards[0]?.id ?? null;
  const selected = selectedId ? (await db.select().from(whiteboards).where(and(eq(whiteboards.id, selectedId), eq(whiteboards.ownerId, userId))).limit(1))[0] : null;
  const summaries = boards.map(({ id, name, color, updatedAt }) => ({ id, name, color, updatedAt: updatedAt.toISOString() }));
  const selectedBoard = selected ? {
    ...selected,
    updatedAt: selected.updatedAt.toISOString(),
    createdAt: selected.createdAt.toISOString(),
  } : null;
  return <AppShell><WhiteboardWorkspace boards={summaries} selected={selectedBoard} aiDiagramEnabled={settings.aiProcessingEnabled && settings.aiDiagramEnabled} /></AppShell>;
}

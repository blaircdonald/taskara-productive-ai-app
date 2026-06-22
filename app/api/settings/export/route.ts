import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { calendarItems, db, kanbanBoards, kanbanColumns, kanbanTaskLabels, kanbanTasks, notes, pages, spaces, taskCategories, userSettings, whiteboards } from "@/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const ownedSpaces = await db.select().from(spaces).where(eq(spaces.ownerId, userId));
  const boardRows = await db.select().from(kanbanBoards).where(eq(kanbanBoards.ownerId, userId));
  const taskRows = await db.select().from(kanbanTasks).where(eq(kanbanTasks.ownerId, userId));
  const data = {
    exportedAt: new Date().toISOString(),
    settings: (await db.select().from(userSettings).where(eq(userSettings.ownerId, userId)))[0] ?? null,
    categories: await db.select().from(taskCategories).where(eq(taskCategories.ownerId, userId)),
    calendarItems: await db.select().from(calendarItems).where(eq(calendarItems.ownerId, userId)),
    kanban: {
      boards: boardRows,
      columns: boardRows.length ? await db.select().from(kanbanColumns).where(inArray(kanbanColumns.boardId, boardRows.map((board) => board.id))) : [],
      tasks: taskRows,
      labels: taskRows.length ? await db.select().from(kanbanTaskLabels).where(inArray(kanbanTaskLabels.taskId, taskRows.map((task) => task.id))) : [],
    },
    notes: await db.select().from(notes).where(eq(notes.ownerId, userId)),
    whiteboards: await db.select().from(whiteboards).where(eq(whiteboards.ownerId, userId)),
    spaces: ownedSpaces,
    pages: ownedSpaces.length ? await db.select().from(pages).where(inArray(pages.spaceId, ownedSpaces.map((space) => space.id))) : [],
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="taskara-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}

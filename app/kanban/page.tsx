import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db, kanbanBoards, kanbanColumns, kanbanTaskLabels, kanbanTasks, taskCategories } from "@/db";
import { KanbanWorkspace } from "./kanban-workspace";

export default async function KanbanPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const boards = await db.select().from(kanbanBoards).where(eq(kanbanBoards.ownerId, userId)).orderBy(asc(kanbanBoards.createdAt));
  const requestedId = Number((await searchParams).board);
  const selected = boards.find((board) => board.id === requestedId) ?? boards[0] ?? null;
  if (selected && selected.id !== requestedId) redirect(`/kanban?board=${selected.id}`);
  const labels = await db.select().from(taskCategories).where(eq(taskCategories.ownerId, userId)).orderBy(asc(taskCategories.name));

  if (!selected) return <AppShell><KanbanWorkspace boards={boards} selectedBoardId={null} columns={[]} tasks={[]} labels={labels} /></AppShell>;

  const [columns, taskRows, labelRows] = await Promise.all([
    db.select().from(kanbanColumns).where(and(eq(kanbanColumns.ownerId, userId), eq(kanbanColumns.boardId, selected.id))).orderBy(asc(kanbanColumns.position)),
    db.select().from(kanbanTasks).where(and(eq(kanbanTasks.ownerId, userId), eq(kanbanTasks.boardId, selected.id))).orderBy(asc(kanbanTasks.position)),
    db.select({
      taskId: kanbanTaskLabels.taskId,
      id: taskCategories.id,
      name: taskCategories.name,
      color: taskCategories.color,
      position: kanbanTaskLabels.position,
    }).from(kanbanTaskLabels).innerJoin(kanbanTasks, and(eq(kanbanTaskLabels.taskId, kanbanTasks.id), eq(kanbanTasks.ownerId, userId))).innerJoin(taskCategories, and(eq(kanbanTaskLabels.categoryId, taskCategories.id), eq(taskCategories.ownerId, userId))).where(eq(kanbanTasks.boardId, selected.id)).orderBy(asc(kanbanTaskLabels.position)),
  ]);

  const tasks = taskRows.map((task) => ({ ...task, labels: labelRows.filter((label) => label.taskId === task.id).map(({ id, name, color }) => ({ id, name, color })) }));
  return <AppShell><KanbanWorkspace boards={boards} selectedBoardId={selected.id} columns={columns} tasks={tasks} labels={labels} /></AppShell>;
}

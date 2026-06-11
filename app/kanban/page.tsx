import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db, kanbanBoardMembers, kanbanColumns, kanbanTaskLabels, kanbanTasks, taskCategories, users } from "@/db";
import { accessibleBoards, currentActor, normalizeEmail, roomIdForBoard } from "@/lib/kanban-access";
import { liveblocks, liveblocksConfigured } from "@/lib/liveblocks-server";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";
import { getUserSettings } from "@/lib/settings";
import { KanbanWorkspace } from "./kanban-workspace";

export default async function KanbanPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  let actor;
  try { actor = await currentActor(); } catch { redirect("/sign-in"); }
  await syncCurrentUserToDatabase();
  const settings = await getUserSettings(actor.clerkId);

  const boards = (await accessibleBoards(actor)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const requestedId = Number((await searchParams).board);
  const selected = boards.find((board) => board.id === requestedId) ?? boards[0] ?? null;
  if (selected && selected.id !== requestedId) redirect(`/kanban?board=${selected.id}`);
  const labels = selected ? await db.select().from(taskCategories).where(and(eq(taskCategories.ownerId, selected.ownerId), eq(taskCategories.scope, "kanban"))).orderBy(asc(taskCategories.name)) : [];

  if (!selected) return <AppShell><KanbanWorkspace boards={boards.map((board) => ({ ...board, isOwner: board.ownerId === actor.clerkId }))} selectedBoardId={null} columns={[]} tasks={[]} labels={labels} collaborators={[]} defaultPriority={settings.defaultTaskPriority} /></AppShell>;

  const [columns, taskRows, labelRows, members, ownerRows] = await Promise.all([
    db.select().from(kanbanColumns).where(and(eq(kanbanColumns.ownerId, selected.ownerId), eq(kanbanColumns.boardId, selected.id))).orderBy(asc(kanbanColumns.position)),
    db.select().from(kanbanTasks).where(and(eq(kanbanTasks.ownerId, selected.ownerId), eq(kanbanTasks.boardId, selected.id))).orderBy(asc(kanbanTasks.position)),
    db.select({
      taskId: kanbanTaskLabels.taskId,
      id: taskCategories.id,
      name: taskCategories.name,
      color: taskCategories.color,
      position: kanbanTaskLabels.position,
    }).from(kanbanTaskLabels).innerJoin(kanbanTasks, and(eq(kanbanTaskLabels.taskId, kanbanTasks.id), eq(kanbanTasks.ownerId, selected.ownerId))).innerJoin(taskCategories, and(eq(kanbanTaskLabels.categoryId, taskCategories.id), eq(taskCategories.ownerId, selected.ownerId))).where(eq(kanbanTasks.boardId, selected.id)).orderBy(asc(kanbanTaskLabels.position)),
    db.select().from(kanbanBoardMembers).where(eq(kanbanBoardMembers.boardId, selected.id)).orderBy(asc(kanbanBoardMembers.invitedAt)),
    db.select().from(users).where(eq(users.clerkId, selected.ownerId)).limit(1),
  ]);

  const memberUsers = members.length ? await db.select().from(users).where(inArray(users.email, members.map((member) => member.email))) : [];
  const ownerUser = ownerRows[0];
  const ownerEmail = normalizeEmail(ownerUser?.email || (selected.ownerId === actor.clerkId ? actor.email : ""));
  if (ownerEmail && liveblocksConfigured) {
    const usersAccesses = Object.fromEntries([ownerEmail, ...members.map((member) => member.email)].map((email) => [email, ["room:write"] as ["room:write"]]));
    await liveblocks.upsertRoom(roomIdForBoard(selected.id), {
      create: { defaultAccesses: [], usersAccesses, metadata: { boardId: String(selected.id), type: "kanban" } },
      update: { defaultAccesses: [], usersAccesses },
    });
  }
  const collaborators = [
    { email: ownerEmail || actor.email, name: ownerUser?.name || (selected.ownerId === actor.clerkId ? actor.name : "Board owner"), avatarUrl: ownerUser?.avatarUrl || (selected.ownerId === actor.clerkId ? actor.avatar : null), role: "owner" },
    ...members.map((member) => {
      const user = memberUsers.find((item) => normalizeEmail(item.email) === member.email);
      return { email: member.email, name: user?.name || null, avatarUrl: user?.avatarUrl || null, role: "editor" };
    }),
  ];
  const tasks = taskRows.map((task) => ({ ...task, labels: labelRows.filter((label) => label.taskId === task.id).map(({ id, name, color }) => ({ id, name, color })) }));
  return <AppShell><KanbanWorkspace boards={boards.map((board) => ({ ...board, isOwner: board.ownerId === actor.clerkId }))} selectedBoardId={selected.id} columns={columns} tasks={tasks} labels={labels} collaborators={collaborators} defaultPriority={settings.defaultTaskPriority} /></AppShell>;
}

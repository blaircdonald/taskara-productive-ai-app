import { currentUser } from "@clerk/nextjs/server";
import { asc, count, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { calendarItems, db, kanbanBoards, kanbanTasks, notes, taskCategories, whiteboards } from "@/db";
import { getUserSettings } from "@/lib/settings";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";
import { SettingsWorkspace } from "./settings-workspace";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const savedUser = await syncCurrentUserToDatabase();
  const [settings, categories, calendarCount, taskCount, noteCount, boardCount, whiteboardCount] = await Promise.all([
    getUserSettings(user.id),
    db.select().from(taskCategories).where(eq(taskCategories.ownerId, user.id)).orderBy(asc(taskCategories.scope), asc(taskCategories.name)),
    db.select({ value: count() }).from(calendarItems).where(eq(calendarItems.ownerId, user.id)),
    db.select({ value: count() }).from(kanbanTasks).where(eq(kanbanTasks.ownerId, user.id)),
    db.select({ value: count() }).from(notes).where(eq(notes.ownerId, user.id)),
    db.select({ value: count() }).from(kanbanBoards).where(eq(kanbanBoards.ownerId, user.id)),
    db.select({ value: count() }).from(whiteboards).where(eq(whiteboards.ownerId, user.id)),
  ]);
  return <AppShell><SettingsWorkspace
    profile={{ name: savedUser?.name || user.fullName || "Taskara user", email: savedUser?.email || user.primaryEmailAddress?.emailAddress || "", avatarUrl: savedUser?.avatarUrl || user.imageUrl }}
    settings={settings}
    categories={categories}
    usage={{ calendar: calendarCount[0].value, tasks: taskCount[0].value, notes: noteCount[0].value, boards: boardCount[0].value, whiteboards: whiteboardCount[0].value }}
  /></AppShell>;
}

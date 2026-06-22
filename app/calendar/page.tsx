import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { calendarItems, db, kanbanTasks, taskCategories } from "@/db";
import { getUserSettings } from "@/lib/settings";
import { CalendarWorkspace } from "./calendar-workspace";

const defaultCategories = [
  { name: "Work", color: "#2563eb", icon: "briefcase" },
  { name: "Personal", color: "#16a34a", icon: "home" },
  { name: "Focus", color: "#d97706", icon: "lightbulb" },
  { name: "Wellbeing", color: "#db2777", icon: "heart" },
];

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ create?: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await db.insert(taskCategories).values(["calendar", "reminders"].flatMap((scope) => defaultCategories.map((category) => ({ ...category, scope, ownerId: userId })))).onConflictDoNothing();

  const [settings, categories, itemRows] = await Promise.all([
    getUserSettings(userId),
    db.select().from(taskCategories).where(and(eq(taskCategories.ownerId, userId), inArray(taskCategories.scope, ["calendar", "reminders"]))).orderBy(asc(taskCategories.name)),
    db.select({
      id: calendarItems.id,
      title: calendarItems.title,
      kind: calendarItems.kind,
      description: calendarItems.description,
      scheduledDate: calendarItems.scheduledDate,
      scheduledTime: calendarItems.scheduledTime,
      categoryId: calendarItems.categoryId,
      categoryName: taskCategories.name,
      categoryColor: taskCategories.color,
      categoryIcon: taskCategories.icon,
      linkedTaskId: kanbanTasks.id,
    }).from(calendarItems).innerJoin(taskCategories, and(eq(calendarItems.categoryId, taskCategories.id), eq(taskCategories.ownerId, userId))).leftJoin(kanbanTasks, and(eq(kanbanTasks.calendarItemId, calendarItems.id), eq(kanbanTasks.ownerId, userId))).where(eq(calendarItems.ownerId, userId)).orderBy(asc(calendarItems.scheduledDate), asc(calendarItems.scheduledTime)),
  ]);

  const createKind = (await searchParams).create === "reminder" ? "reminder" : null;
  return <AppShell><CalendarWorkspace initialItems={itemRows} categories={categories} defaultView={settings.defaultCalendarView === "week" ? "week" : "month"} createKind={createKind} /></AppShell>;
}

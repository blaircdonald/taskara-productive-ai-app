import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { calendarItems, db, taskCategories } from "@/db";
import { CalendarWorkspace } from "./calendar-workspace";

const defaultCategories = [
  { name: "Work", color: "#2563eb" },
  { name: "Personal", color: "#16a34a" },
  { name: "Focus", color: "#d97706" },
  { name: "Wellbeing", color: "#db2777" },
];

export default async function CalendarPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await db.insert(taskCategories).values(defaultCategories.map((category) => ({ ...category, ownerId: userId }))).onConflictDoNothing();

  const [categories, itemRows] = await Promise.all([
    db.select().from(taskCategories).where(eq(taskCategories.ownerId, userId)).orderBy(asc(taskCategories.name)),
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
    }).from(calendarItems).innerJoin(taskCategories, and(eq(calendarItems.categoryId, taskCategories.id), eq(taskCategories.ownerId, userId))).where(eq(calendarItems.ownerId, userId)).orderBy(asc(calendarItems.scheduledDate), asc(calendarItems.scheduledTime)),
  ]);

  return <AppShell><CalendarWorkspace initialItems={itemRows} categories={categories} /></AppShell>;
}

import { currentUser } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db, taskCategories } from "@/db";
import { getUserSettings } from "@/lib/settings";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";
import { SettingsWorkspace } from "./settings-workspace";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const savedUser = await syncCurrentUserToDatabase();
  const [settings, categories] = await Promise.all([
    getUserSettings(user.id),
    db.select().from(taskCategories).where(eq(taskCategories.ownerId, user.id)).orderBy(asc(taskCategories.scope), asc(taskCategories.name)),
  ]);
  return <AppShell><SettingsWorkspace
    profile={{ name: savedUser?.name || user.fullName || "Taskara user", email: savedUser?.email || user.primaryEmailAddress?.emailAddress || "", avatarUrl: savedUser?.avatarUrl || user.imageUrl }}
    settings={settings}
    categories={categories}
  /></AppShell>;
}

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getDashboardData } from "@/lib/dashboard";
import { DashboardWorkspace } from "../dashboard-workspace";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const data = await getDashboardData();
  return <AppShell><DashboardWorkspace data={data} /></AppShell>;
}

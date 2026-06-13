import { redirect } from "next/navigation";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";

export const dynamic = "force-dynamic";

export default async function SyncUserPage() {
  const user = await syncCurrentUserToDatabase();

  if (!user) {
    redirect("/sign-in");
  }

  redirect("/dashboard");
}

import "server-only";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, userSettings } from "@/db";

export async function currentOwnerId() {
  const { userId } = await auth();
  if (!userId) throw new Error("You must be signed in.");
  return userId;
}

export async function getUserSettings(ownerId?: string) {
  const owner = ownerId ?? await currentOwnerId();
  const existing = await db.query.userSettings.findFirst({ where: eq(userSettings.ownerId, owner) });
  if (existing) return existing;
  const [created] = await db.insert(userSettings).values({ ownerId: owner }).onConflictDoNothing().returning();
  if (created) return created;
  return (await db.select().from(userSettings).where(eq(userSettings.ownerId, owner)).limit(1))[0];
}

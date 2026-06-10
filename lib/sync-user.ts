import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { eq, or } from "drizzle-orm";
import { db, users } from "@/db";

export async function syncCurrentUserToDatabase() {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const email = (
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress
  )?.trim().toLowerCase();

  if (!email) {
    throw new Error("Cannot save Clerk user without an email address.");
  }

  const name =
    user.fullName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.username ||
    null;

  const existingUser = await db.query.users.findFirst({
    where: or(eq(users.clerkId, user.id), eq(users.email, email)),
  });

  if (existingUser) {
    const [savedUser] = await db
      .update(users)
      .set({
        clerkId: user.id,
        email,
        name,
        avatarUrl: user.imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id))
      .returning();

    return savedUser;
  }

  const [savedUser] = await db
    .insert(users)
    .values({
      clerkId: user.id,
      email,
      name,
      avatarUrl: user.imageUrl,
    })
    .returning();

  return savedUser;
}

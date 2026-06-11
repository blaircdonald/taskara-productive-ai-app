import "server-only";

import { and, eq, or } from "drizzle-orm";
import { db, pages, spaceMembers, spaces } from "@/db";
import { currentActor } from "@/lib/kanban-access";

export { currentActor };

export async function accessibleSpaces(actor: Awaited<ReturnType<typeof currentActor>>) {
  return db.selectDistinct().from(spaces).leftJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
    .where(or(eq(spaces.ownerId, actor.clerkId), eq(spaceMembers.email, actor.email)));
}

export async function accessibleSpace(actor: Awaited<ReturnType<typeof currentActor>>, spaceId: number) {
  const row = (await db.selectDistinct().from(spaces).leftJoin(spaceMembers, eq(spaceMembers.spaceId, spaces.id))
    .where(and(eq(spaces.id, spaceId), or(eq(spaces.ownerId, actor.clerkId), eq(spaceMembers.email, actor.email)))).limit(1))[0];
  if (!row?.spaces) throw new Error("Space not found.");
  return { ...row.spaces, isOwner: row.spaces.ownerId === actor.clerkId };
}

export async function ownerSpace(actor: Awaited<ReturnType<typeof currentActor>>, spaceId: number) {
  const space = await accessibleSpace(actor, spaceId);
  if (!space.isOwner) throw new Error("Only the space owner can do that.");
  return space;
}

export async function accessiblePage(actor: Awaited<ReturnType<typeof currentActor>>, pageId: number) {
  const page = (await db.select().from(pages).where(eq(pages.id, pageId)).limit(1))[0];
  if (!page) throw new Error("Page not found.");
  return { page, space: await accessibleSpace(actor, page.spaceId) };
}

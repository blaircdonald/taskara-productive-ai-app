import { eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db, pages, spaceActivity, spaceFavorites, spaceMembers, users } from "@/db";
import { accessibleSpaces, currentActor } from "@/lib/spaces-access";
import { syncCurrentUserToDatabase } from "@/lib/sync-user";
import { SpacesWorkspace } from "./spaces-workspace";

export default async function SpacesPage() {
  let actor;
  try { actor = await currentActor(); } catch { redirect("/sign-in"); }
  await syncCurrentUserToDatabase();
  const rows = await accessibleSpaces(actor);
  const all = rows.map((row) => row.spaces);
  const ids = all.map((space) => space.id);
  const [pageRows, memberRows, favoriteRows, activityRows] = ids.length ? await Promise.all([
    db.select({ id: pages.id, spaceId: pages.spaceId, name: pages.name, archivedAt: pages.archivedAt }).from(pages).where(inArray(pages.spaceId, ids)),
    db.select().from(spaceMembers).where(inArray(spaceMembers.spaceId, ids)),
    db.select().from(spaceFavorites).where(eq(spaceFavorites.userId, actor.clerkId)),
    db.select().from(spaceActivity).where(eq(spaceActivity.userId, actor.clerkId)),
  ]) : [[], [], [], []];
  const memberUsers = memberRows.length ? await db.select().from(users).where(inArray(users.email, memberRows.map((member) => member.email))) : [];
  const ownerUsers = all.length ? await db.select().from(users).where(inArray(users.clerkId, all.map((space) => space.ownerId))) : [];
  const data = all.map((space) => ({
    ...space,
    archivedAt: space.archivedAt?.toISOString() ?? null,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
    isOwner: space.ownerId === actor.clerkId,
    isFavorite: favoriteRows.some((favorite) => favorite.spaceId === space.id),
    openedAt: activityRows.find((activity) => activity.spaceId === space.id)?.openedAt.toISOString() ?? null,
    pageCount: pageRows.filter((page) => page.spaceId === space.id && !page.archivedAt).length,
    pageNames: pageRows.filter((page) => page.spaceId === space.id && !page.archivedAt).map((page) => page.name),
    members: [
      ownerUsers.find((user) => user.clerkId === space.ownerId),
      ...memberRows.filter((member) => member.spaceId === space.id).map((member) => memberUsers.find((user) => user.email === member.email) ?? { email: member.email, name: null, avatarUrl: null }),
    ].filter(Boolean).map((user) => ({ email: user!.email, name: user!.name, avatarUrl: user!.avatarUrl })),
  }));
  return <AppShell><SpacesWorkspace spaces={data} /></AppShell>;
}

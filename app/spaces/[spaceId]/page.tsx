import { and, asc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db, pageFavorites, pages, spaceMembers, users } from "@/db";
import { accessibleSpace, accessibleSpaces, currentActor } from "@/lib/spaces-access";
import { SpaceWorkspace } from "./space-workspace";

export default async function SpacePage({ params, searchParams }: { params: Promise<{ spaceId: string }>; searchParams: Promise<{ share?: string }> }) {
  let actor;
  try { actor = await currentActor(); } catch { redirect("/sign-in"); }
  const spaceId = Number((await params).spaceId);
  let space;
  try { space = await accessibleSpace(actor, spaceId); } catch { redirect("/spaces"); }
  const [pageRows, favorites, members, available] = await Promise.all([
    db.select().from(pages).where(eq(pages.spaceId, spaceId)).orderBy(asc(pages.name)),
    db.select().from(pageFavorites).where(eq(pageFavorites.userId, actor.clerkId)),
    db.select().from(spaceMembers).where(eq(spaceMembers.spaceId, spaceId)).orderBy(asc(spaceMembers.invitedAt)),
    accessibleSpaces(actor),
  ]);
  const userIds = [...new Set([space.ownerId, ...pageRows.map((page) => page.updatedBy)])];
  const userRows = userIds.length ? await db.select().from(users).where(inArray(users.clerkId, userIds)) : [];
  const memberUsers = members.length ? await db.select().from(users).where(inArray(users.email, members.map((member) => member.email))) : [];
  return <AppShell><SpaceWorkspace
    space={{ ...space, archivedAt: space.archivedAt?.toISOString() ?? null, createdAt: space.createdAt.toISOString(), updatedAt: space.updatedAt.toISOString() }}
    pages={pageRows.map((page) => ({ ...page, content: undefined, archivedAt: page.archivedAt?.toISOString() ?? null, createdAt: page.createdAt.toISOString(), updatedAt: page.updatedAt.toISOString(), isFavorite: favorites.some((favorite) => favorite.pageId === page.id), updatedByUser: userRows.find((user) => user.clerkId === page.updatedBy) ?? null }))}
    collaborators={[{ email: actor.email, name: userRows.find((user) => user.clerkId === space.ownerId)?.name ?? "Space owner", avatarUrl: userRows.find((user) => user.clerkId === space.ownerId)?.avatarUrl ?? null, role: "owner" }, ...members.map((member) => { const user = memberUsers.find((item) => item.email === member.email); return { email: member.email, name: user?.name ?? null, avatarUrl: user?.avatarUrl ?? null, role: "editor" }; })]}
    availableSpaces={available.map((row) => ({ id: row.spaces.id, name: row.spaces.name, archived: Boolean(row.spaces.archivedAt) }))}
    shareOpen={(await searchParams).share === "1"}
  /></AppShell>;
}

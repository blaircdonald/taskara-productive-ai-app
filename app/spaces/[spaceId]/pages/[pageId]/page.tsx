import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { db, pageFavorites, users } from "@/db";
import { accessiblePage, accessibleSpaces, currentActor } from "@/lib/spaces-access";
import { PageWorkspace } from "./page-workspace";

export default async function PageDetail({ params }: { params: Promise<{ spaceId: string; pageId: string }> }) {
  let actor;
  try { actor = await currentActor(); } catch { redirect("/sign-in"); }
  const route = await params;
  let result;
  try { result = await accessiblePage(actor, Number(route.pageId)); } catch { redirect("/spaces"); }
  if (result.page.spaceId !== Number(route.spaceId)) redirect(`/spaces/${result.page.spaceId}/pages/${result.page.id}`);
  const [favorite, editor, available] = await Promise.all([
    db.select().from(pageFavorites).where(eq(pageFavorites.userId, actor.clerkId)),
    db.select().from(users).where(eq(users.clerkId, result.page.updatedBy)).limit(1),
    accessibleSpaces(actor),
  ]);
  return <AppShell><PageWorkspace page={{ ...result.page, archivedAt: result.page.archivedAt?.toISOString() ?? null, createdAt: result.page.createdAt.toISOString(), updatedAt: result.page.updatedAt.toISOString(), isFavorite: favorite.some((item) => item.pageId === result.page.id) }} space={{ id: result.space.id, name: result.space.name, color: result.space.color, isOwner: result.space.isOwner }} editor={editor[0] ? { name: editor[0].name, email: editor[0].email, avatarUrl: editor[0].avatarUrl } : null} availableSpaces={available.map((row) => ({ id: row.spaces.id, name: row.spaces.name, archived: Boolean(row.spaces.archivedAt) }))} /></AppShell>;
}

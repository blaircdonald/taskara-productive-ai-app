"use server";

import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, pageFavorites, pages, spaceActivity, spaceFavorites, spaceMembers, spaces } from "@/db";
import { contentForTemplate, pageTemplates, type PageTemplate } from "@/lib/page-templates";
import { accessiblePage, accessibleSpace, currentActor, ownerSpace } from "@/lib/spaces-access";

const colorPattern = /^#[0-9a-fA-F]{6}$/;
const refresh = () => revalidatePath("/spaces", "layout");
const validName = (value: string, label: string) => {
  const name = value.trim();
  if (!name || name.length > 120) throw new Error(`${label} must be between 1 and 120 characters.`);
  return name;
};
const validDescription = (value: string) => value.trim().slice(0, 1000) || null;
const validColor = (value: string) => {
  if (!colorPattern.test(value)) throw new Error("Choose a valid color.");
  return value;
};
const validTemplate = (value: string): PageTemplate => {
  if (!pageTemplates.includes(value as PageTemplate)) throw new Error("Choose a valid template.");
  return value as PageTemplate;
};

export async function createSpace(input: { name: string; description: string; color: string }) {
  const actor = await currentActor();
  const [space] = await db.insert(spaces).values({ ownerId: actor.clerkId, name: validName(input.name, "Space name"), description: validDescription(input.description), color: validColor(input.color) }).returning({ id: spaces.id });
  refresh();
  return space.id;
}

export async function updateSpace(spaceId: number, input: { name: string; description: string; color: string }) {
  const actor = await currentActor();
  await ownerSpace(actor, spaceId);
  await db.update(spaces).set({ name: validName(input.name, "Space name"), description: validDescription(input.description), color: validColor(input.color), updatedAt: new Date() }).where(eq(spaces.id, spaceId));
  refresh();
}

export async function duplicateSpace(spaceId: number) {
  const actor = await currentActor();
  const source = await ownerSpace(actor, spaceId);
  const [copy] = await db.insert(spaces).values({ ownerId: actor.clerkId, name: `${source.name} copy`.slice(0, 120), description: source.description, color: source.color }).returning();
  const sourcePages = await db.select().from(pages).where(and(eq(pages.spaceId, spaceId), isNull(pages.archivedAt)));
  if (sourcePages.length) await db.insert(pages).values(sourcePages.map((page) => ({ spaceId: copy.id, name: page.name, description: page.description, template: page.template, content: page.content, createdBy: actor.clerkId, updatedBy: actor.clerkId })));
  refresh();
  return copy.id;
}

export async function setSpaceArchived(spaceId: number, archived: boolean) {
  const actor = await currentActor();
  await ownerSpace(actor, spaceId);
  await db.update(spaces).set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() }).where(eq(spaces.id, spaceId));
  refresh();
}

export async function permanentlyDeleteSpace(spaceId: number) {
  const actor = await currentActor();
  await ownerSpace(actor, spaceId);
  const result = await db.delete(spaces).where(and(eq(spaces.id, spaceId), isNotNull(spaces.archivedAt))).returning({ id: spaces.id });
  if (!result.length) throw new Error("Archive this space before deleting it permanently.");
  refresh();
}

export async function setSpaceFavorite(spaceId: number, favorite: boolean) {
  const actor = await currentActor();
  await accessibleSpace(actor, spaceId);
  if (favorite) await db.insert(spaceFavorites).values({ spaceId, userId: actor.clerkId }).onConflictDoNothing();
  else await db.delete(spaceFavorites).where(and(eq(spaceFavorites.spaceId, spaceId), eq(spaceFavorites.userId, actor.clerkId)));
  refresh();
}

export async function recordSpaceOpen(spaceId: number) {
  const actor = await currentActor();
  await accessibleSpace(actor, spaceId);
  await db.insert(spaceActivity).values({ spaceId, userId: actor.clerkId, openedAt: new Date() }).onConflictDoUpdate({ target: [spaceActivity.spaceId, spaceActivity.userId], set: { openedAt: new Date() } });
  refresh();
}

export async function inviteSpaceMember(spaceId: number, emailValue: string) {
  const actor = await currentActor();
  await ownerSpace(actor, spaceId);
  const email = emailValue.trim().toLowerCase();
  if (!email.includes("@") || email.length > 254) throw new Error("Enter a valid email address.");
  if (email === actor.email) throw new Error("You already own this space.");
  await db.insert(spaceMembers).values({ spaceId, email, invitedBy: actor.clerkId }).onConflictDoNothing();
  refresh();
}

export async function removeSpaceMember(spaceId: number, email: string) {
  const actor = await currentActor();
  await ownerSpace(actor, spaceId);
  await db.delete(spaceMembers).where(and(eq(spaceMembers.spaceId, spaceId), eq(spaceMembers.email, email.trim().toLowerCase())));
  refresh();
}

export async function createPage(spaceId: number, input: { name: string; description: string; template: string }) {
  const actor = await currentActor();
  const space = await accessibleSpace(actor, spaceId);
  if (space.archivedAt) throw new Error("Restore this space before adding pages.");
  const template = validTemplate(input.template);
  const [page] = await db.insert(pages).values({ spaceId, name: validName(input.name, "Page name"), description: validDescription(input.description), template, content: contentForTemplate(template), createdBy: actor.clerkId, updatedBy: actor.clerkId }).returning({ id: pages.id });
  await db.update(spaces).set({ updatedAt: new Date() }).where(eq(spaces.id, spaceId));
  refresh();
  return page.id;
}

export async function savePage(pageId: number, input: { name: string; description: string; content: unknown }) {
  const actor = await currentActor();
  const { page, space } = await accessiblePage(actor, pageId);
  if (page.archivedAt || space.archivedAt) throw new Error("Restore this page before editing it.");
  if (!input.content || typeof input.content !== "object") throw new Error("Page content is invalid.");
  await db.update(pages).set({ name: validName(input.name, "Page name"), description: validDescription(input.description), content: input.content, updatedBy: actor.clerkId, updatedAt: new Date() }).where(eq(pages.id, pageId));
  await db.update(spaces).set({ updatedAt: new Date() }).where(eq(spaces.id, page.spaceId));
}

export async function movePage(pageId: number, destinationSpaceId: number) {
  const actor = await currentActor();
  const { page } = await accessiblePage(actor, pageId);
  const destination = await accessibleSpace(actor, destinationSpaceId);
  if (destination.archivedAt) throw new Error("Choose an active destination space.");
  await db.update(pages).set({ spaceId: destinationSpaceId, updatedBy: actor.clerkId, updatedAt: new Date() }).where(eq(pages.id, pageId));
  await db.update(spaces).set({ updatedAt: new Date() }).where(eq(spaces.id, page.spaceId));
  refresh();
  return destinationSpaceId;
}

export async function duplicatePage(pageId: number) {
  const actor = await currentActor();
  const { page } = await accessiblePage(actor, pageId);
  const [copy] = await db.insert(pages).values({ spaceId: page.spaceId, name: `${page.name} copy`.slice(0, 120), description: page.description, template: page.template, content: page.content, createdBy: actor.clerkId, updatedBy: actor.clerkId }).returning({ id: pages.id });
  refresh();
  return copy.id;
}

export async function setPageFavorite(pageId: number, favorite: boolean) {
  const actor = await currentActor();
  await accessiblePage(actor, pageId);
  if (favorite) await db.insert(pageFavorites).values({ pageId, userId: actor.clerkId }).onConflictDoNothing();
  else await db.delete(pageFavorites).where(and(eq(pageFavorites.pageId, pageId), eq(pageFavorites.userId, actor.clerkId)));
  refresh();
}

export async function setPageArchived(pageId: number, archived: boolean) {
  const actor = await currentActor();
  await accessiblePage(actor, pageId);
  await db.update(pages).set({ archivedAt: archived ? new Date() : null, updatedBy: actor.clerkId, updatedAt: new Date() }).where(eq(pages.id, pageId));
  refresh();
}

export async function permanentlyDeletePage(pageId: number) {
  const actor = await currentActor();
  await accessiblePage(actor, pageId);
  const result = await db.delete(pages).where(and(eq(pages.id, pageId), isNotNull(pages.archivedAt))).returning({ id: pages.id });
  if (!result.length) throw new Error("Archive this page before deleting it permanently.");
  refresh();
}

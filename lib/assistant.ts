import "server-only";

import { GoogleGenAI } from "@google/genai";
import { and, asc, desc, eq, ilike, isNull, max, or } from "drizzle-orm";
import {
  assistantActionRequests,
  assistantMessages,
  assistantThreads,
  calendarItems,
  db,
  kanbanBoards,
  kanbanColumns,
  kanbanTasks,
  notes,
  pages,
  spaces,
  taskCategories,
  userSettings,
  whiteboards,
} from "@/db";
import { accessibleBoard, accessibleColumn, accessibleBoards, currentActor } from "@/lib/kanban-access";
import { accessibleSpace, accessibleSpaces } from "@/lib/spaces-access";
import { getUserSettings } from "@/lib/settings";
import { recordActivity } from "@/lib/activity";

export type AssistantResult = {
  title: string;
  detail: string;
  href?: string;
  pendingActionId?: number;
};

export const assistantTools = [
  {
    name: "search_workspace",
    description: "Search the user's boards, columns, notes, spaces, and pages. Use before acting when a target name is mentioned.",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
  },
  {
    name: "create_board",
    description: "Create a Kanban board after the user gives a board name.",
    parameters: { type: "object", properties: { name: { type: "string" }, color: { type: "string" } }, required: ["name"] },
  },
  {
    name: "create_task",
    description: "Create a Kanban task. Ask for the board or column and due date if missing.",
    parameters: { type: "object", properties: { columnId: { type: "number" }, title: { type: "string" }, description: { type: "string" }, dueDate: { type: "string" }, priority: { type: "string", enum: ["low", "medium", "high"] } }, required: ["columnId", "title", "dueDate"] },
  },
  {
    name: "create_calendar_item",
    description: "Create a calendar task or reminder. Ask for a date and time when the user's request requires them.",
    parameters: { type: "object", properties: { title: { type: "string" }, kind: { type: "string", enum: ["task", "reminder"] }, description: { type: "string" }, scheduledDate: { type: "string" }, scheduledTime: { type: "string" } }, required: ["title", "kind"] },
  },
  {
    name: "create_note",
    description: "Create a new note with a title and content.",
    parameters: { type: "object", properties: { title: { type: "string" }, content: { type: "string" } }, required: ["title"] },
  },
  {
    name: "summarize_note",
    description: "Read and summarize a note. Search first when the note id is unknown.",
    parameters: { type: "object", properties: { noteId: { type: "number" } }, required: ["noteId"] },
  },
  {
    name: "refine_note",
    description: "Propose replacing an existing note's content. This always requires user confirmation.",
    parameters: { type: "object", properties: { noteId: { type: "number" }, title: { type: "string" }, content: { type: "string" } }, required: ["noteId", "content"] },
  },
  {
    name: "create_whiteboard_diagram",
    description: "Create a whiteboard containing a simple diagram from the user's idea.",
    parameters: { type: "object", properties: { name: { type: "string" }, prompt: { type: "string" } }, required: ["name", "prompt"] },
  },
  {
    name: "create_space_page",
    description: "Generate a custom rich-text page in an existing Space. Search first when the Space id is unknown.",
    parameters: { type: "object", properties: { spaceId: { type: "number" }, title: { type: "string" }, description: { type: "string" }, content: { type: "string" } }, required: ["spaceId", "title", "content"] },
  },
  {
    name: "update_settings",
    description: "Propose changing user settings. This always requires user confirmation.",
    parameters: { type: "object", properties: { changes: { type: "object" } }, required: ["changes"] },
  },
] as const;

function textDocument(text = "") {
  const lines = text.trim().split(/\n+/).filter(Boolean);
  return { type: "doc", content: (lines.length ? lines : [""]).map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line.slice(0, 5000) }] : undefined })) };
}

function documentText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { text?: unknown; content?: unknown };
  return [typeof node.text === "string" ? node.text : "", ...(Array.isArray(node.content) ? node.content.map(documentText) : [])].filter(Boolean).join(" ");
}

function validDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validTime(value: unknown) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function stringArg(args: Record<string, unknown>, key: string, fallback = "") {
  return typeof args[key] === "string" ? args[key].trim() : fallback;
}

function numberArg(args: Record<string, unknown>, key: string) {
  const value = Number(args[key]);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`A valid ${key} is required.`);
  return value;
}

export async function ownedThread(ownerId: string, threadId: number) {
  const thread = (await db.select().from(assistantThreads).where(and(eq(assistantThreads.id, threadId), eq(assistantThreads.ownerId, ownerId))).limit(1))[0];
  if (!thread) throw new Error("Conversation not found.");
  return thread;
}

export async function createAssistantThread(ownerId: string, title = "New conversation") {
  const [thread] = await db.insert(assistantThreads).values({ ownerId, title: title.trim().slice(0, 80) || "New conversation" }).returning();
  return thread;
}

export async function saveAssistantMessage(ownerId: string, threadId: number, role: "user" | "assistant" | "system", content: string, source = "text", metadata: Record<string, unknown> = {}) {
  await ownedThread(ownerId, threadId);
  const [message] = await db.insert(assistantMessages).values({ ownerId, threadId, role, content: content.trim(), source, metadata }).returning();
  await db.update(assistantThreads).set({ updatedAt: new Date() }).where(and(eq(assistantThreads.id, threadId), eq(assistantThreads.ownerId, ownerId)));
  if (role === "user") await recordActivity({ actorId: ownerId, feature: "assistant", action: "updated", entityType: "assistant-thread", entityId: threadId, title: content.slice(0, 100), href: "/assistant", coalesce: true });
  return message;
}

async function defaultCategory(ownerId: string, scope: "calendar" | "reminders") {
  const existing = (await db.select().from(taskCategories).where(and(eq(taskCategories.ownerId, ownerId), eq(taskCategories.scope, scope))).orderBy(asc(taskCategories.name)).limit(1))[0];
  if (existing) return existing;
  const name = scope === "reminders" ? "Personal" : "Focus";
  const [created] = await db.insert(taskCategories).values({ ownerId, scope, name, color: scope === "reminders" ? "#16a34a" : "#d97706", icon: scope === "reminders" ? "bell" : "lightbulb" }).onConflictDoNothing().returning();
  return created ?? (await db.select().from(taskCategories).where(and(eq(taskCategories.ownerId, ownerId), eq(taskCategories.scope, scope), eq(taskCategories.name, name))).limit(1))[0];
}

async function requestConfirmation(ownerId: string, threadId: number, action: string, args: Record<string, unknown>, summary: string): Promise<AssistantResult> {
  const [request] = await db.insert(assistantActionRequests).values({ ownerId, threadId, action, arguments: args, summary }).returning();
  return { title: "Confirmation needed", detail: summary, pendingActionId: request.id };
}

export async function runAssistantAction(ownerId: string, threadId: number, action: string, args: Record<string, unknown>, confirmed = false): Promise<AssistantResult> {
  await ownedThread(ownerId, threadId);
  const actor = await currentActor();
  if (actor.clerkId !== ownerId) throw new Error("You must be signed in.");

  if (action === "search_workspace") {
    const query = stringArg(args, "query");
    if (!query) throw new Error("Tell me what to search for.");
    const pattern = `%${query.slice(0, 80)}%`;
    const [boards, noteRows, spaceRows, pageRows] = await Promise.all([
      accessibleBoards(actor),
      db.select({ id: notes.id, title: notes.title }).from(notes).where(and(eq(notes.ownerId, ownerId), isNull(notes.trashedAt), ilike(notes.title, pattern))).limit(8),
      accessibleSpaces(actor),
      db.select({ id: pages.id, name: pages.name, spaceId: pages.spaceId }).from(pages).where(and(isNull(pages.archivedAt), ilike(pages.name, pattern))).limit(8),
    ]);
    const boardMatches = boards.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
    const columns = boardMatches.length ? await db.select({ id: kanbanColumns.id, name: kanbanColumns.name, boardId: kanbanColumns.boardId }).from(kanbanColumns).where(or(...boardMatches.map((board) => eq(kanbanColumns.boardId, board.id)))) : [];
    const allowedSpaceIds = new Set(spaceRows.map((row) => row.spaces.id));
    const results = [
      ...boardMatches.map((item) => `Board: ${item.name} (boardId ${item.id})`),
      ...columns.map((item) => `Column: ${item.name} (columnId ${item.id}, boardId ${item.boardId})`),
      ...noteRows.map((item) => `Note: ${item.title} (noteId ${item.id})`),
      ...spaceRows.filter((row) => row.spaces.name.toLowerCase().includes(query.toLowerCase())).map((row) => `Space: ${row.spaces.name} (spaceId ${row.spaces.id})`),
      ...pageRows.filter((item) => allowedSpaceIds.has(item.spaceId)).map((item) => `Page: ${item.name} (pageId ${item.id}, spaceId ${item.spaceId})`),
    ];
    return { title: "Workspace search", detail: results.length ? results.join("\n") : `No accessible items matched "${query}".` };
  }

  if (action === "create_board") {
    const name = stringArg(args, "name").slice(0, 80);
    if (!name) throw new Error("What should the board be called?");
    const [board] = await db.insert(kanbanBoards).values({ ownerId, name, color: stringArg(args, "color", "#2563eb") }).returning();
    await db.insert(kanbanColumns).values(["Todo", "In Progress", "Done"].map((columnName, position) => ({ ownerId, boardId: board.id, name: columnName, position })));
    return { title: "Kanban board created", detail: name, href: `/kanban?board=${board.id}` };
  }

  if (action === "create_task") {
    const columnId = numberArg(args, "columnId");
    const { column, board } = await accessibleColumn(actor, columnId);
    const title = stringArg(args, "title").slice(0, 140);
    const dueDate = stringArg(args, "dueDate");
    if (!title) throw new Error("What should the task be called?");
    if (!validDate(dueDate)) throw new Error("What date is the task due? Use YYYY-MM-DD.");
    const position = (await db.select({ value: max(kanbanTasks.position) }).from(kanbanTasks).where(and(eq(kanbanTasks.columnId, columnId), eq(kanbanTasks.ownerId, board.ownerId))))[0]?.value ?? -1;
    await db.insert(kanbanTasks).values({ ownerId: board.ownerId, boardId: column.boardId, columnId, title, description: stringArg(args, "description").slice(0, 1000) || null, dueDate, priority: ["low", "medium", "high"].includes(stringArg(args, "priority")) ? stringArg(args, "priority") : "medium", position: position + 1 });
    return { title: "Task created", detail: `${title} · due ${dueDate}`, href: `/kanban?board=${column.boardId}` };
  }

  if (action === "create_calendar_item") {
    const title = stringArg(args, "title").slice(0, 140);
    const kind = stringArg(args, "kind") === "task" ? "task" : "reminder";
    const scheduledDate = stringArg(args, "scheduledDate");
    const scheduledTime = stringArg(args, "scheduledTime");
    if (!title) throw new Error("What should the calendar item be called?");
    if (scheduledDate && !validDate(scheduledDate)) throw new Error("Use a calendar date in YYYY-MM-DD format.");
    if (scheduledTime && !validTime(scheduledTime)) throw new Error("Use a time in HH:MM format.");
    const category = await defaultCategory(ownerId, kind === "reminder" ? "reminders" : "calendar");
    await db.insert(calendarItems).values({ ownerId, title, kind, description: stringArg(args, "description").slice(0, 1000) || null, scheduledDate: scheduledDate || null, scheduledTime: scheduledTime ? `${scheduledTime}:00` : null, categoryId: category.id });
    return { title: `${kind === "reminder" ? "Reminder" : "Calendar task"} created`, detail: [title, scheduledDate, scheduledTime].filter(Boolean).join(" · "), href: "/calendar" };
  }

  if (action === "create_note") {
    const title = stringArg(args, "title", "Untitled note").slice(0, 160);
    const [note] = await db.insert(notes).values({ ownerId, title, content: textDocument(stringArg(args, "content")) }).returning({ id: notes.id });
    return { title: "Note created", detail: title, href: `/notes?note=${note.id}` };
  }

  if (action === "summarize_note") {
    const noteId = numberArg(args, "noteId");
    const note = (await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.ownerId, ownerId), isNull(notes.trashedAt))).limit(1))[0];
    if (!note) throw new Error("Note not found.");
    return { title: `Note content: ${note.title}`, detail: documentText(note.content).slice(0, 12000), href: `/notes?note=${note.id}` };
  }

  if (action === "refine_note") {
    const noteId = numberArg(args, "noteId");
    const note = (await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.ownerId, ownerId), isNull(notes.trashedAt))).limit(1))[0];
    if (!note) throw new Error("Note not found.");
    if (!confirmed) return requestConfirmation(ownerId, threadId, action, args, `Replace the content of "${note.title}" with the proposed refined version?`);
    await db.update(notes).set({ title: stringArg(args, "title", note.title).slice(0, 160), content: textDocument(stringArg(args, "content")), updatedAt: new Date() }).where(and(eq(notes.id, noteId), eq(notes.ownerId, ownerId)));
    return { title: "Note updated", detail: note.title, href: `/notes?note=${note.id}` };
  }

  if (action === "create_whiteboard_diagram") {
    const name = stringArg(args, "name", "AI diagram").slice(0, 120);
    const labels = stringArg(args, "prompt").split(/,|->|\n/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
    const nodes = (labels.length ? labels : [stringArg(args, "prompt", "Idea")]).flatMap((label, index) => {
      const x = 120 + (index % 3) * 300;
      const y = 120 + Math.floor(index / 3) * 190;
      const shared = { angle: 0, strokeWidth: 2, strokeStyle: "solid", roughness: 1, opacity: 100, groupIds: [], frameId: null, roundness: null, seed: 1000 + index, version: 1, versionNonce: 2000 + index, isDeleted: false, boundElements: null, updated: Date.now(), link: null, locked: false };
      return [
        { ...shared, id: `assistant-node-${Date.now()}-${index}`, type: "rectangle", x, y, width: 220, height: 100, strokeColor: "#57534e", backgroundColor: ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3"][index % 4], fillStyle: "solid", roundness: { type: 3 } },
        { ...shared, id: `assistant-label-${Date.now()}-${index}`, type: "text", x: x + 18, y: y + 36, width: 184, height: 25, strokeColor: "#292524", backgroundColor: "transparent", fillStyle: "solid", text: label.slice(0, 80), fontSize: 18, fontFamily: 1, textAlign: "center", verticalAlign: "middle", containerId: null, originalText: label.slice(0, 80), autoResize: true, lineHeight: 1.25 },
      ];
    });
    const [board] = await db.insert(whiteboards).values({ ownerId, name, elements: nodes }).returning({ id: whiteboards.id });
    return { title: "Whiteboard diagram created", detail: name, href: `/whiteboard?board=${board.id}` };
  }

  if (action === "create_space_page") {
    const spaceId = numberArg(args, "spaceId");
    const space = await accessibleSpace(actor, spaceId);
    if (space.archivedAt) throw new Error("Choose an active Space.");
    const title = stringArg(args, "title").slice(0, 120);
    if (!title) throw new Error("What should the page be called?");
    const [page] = await db.insert(pages).values({ spaceId, name: title, description: stringArg(args, "description").slice(0, 1000) || null, template: "blank", content: textDocument(stringArg(args, "content")), createdBy: ownerId, updatedBy: ownerId }).returning({ id: pages.id });
    return { title: "Custom page created", detail: `${title} in ${space.name}`, href: `/spaces/${spaceId}/pages/${page.id}` };
  }

  if (action === "update_settings") {
    const changes = args.changes && typeof args.changes === "object" && !Array.isArray(args.changes) ? args.changes as Record<string, unknown> : {};
    if (!Object.keys(changes).length) throw new Error("Which setting should I change?");
    if (!confirmed) return requestConfirmation(ownerId, threadId, action, args, `Apply these settings changes: ${JSON.stringify(changes)}?`);
    const allowed: Record<string, readonly unknown[]> = {
      theme: ["system", "light", "dark"], defaultCalendarView: ["month", "week"], defaultTaskPriority: ["low", "medium", "high"],
      aiBehavior: ["concise", "balanced", "detailed"], aiTone: ["Professional", "Friendly", "Confident", "Casual", "Concise"],
      notifyReminders: [true, false], notifyDailySummary: [true, false], notifyCollaboration: [true, false], noteAutoSave: [true, false],
      aiRefineEnabled: [true, false], aiDiagramEnabled: [true, false], aiProcessingEnabled: [true, false],
    };
    const safe = Object.fromEntries(Object.entries(changes).filter(([key, value]) => allowed[key]?.includes(value)));
    if (!Object.keys(safe).length) throw new Error("Those settings changes are not supported.");
    await getUserSettings(ownerId);
    await db.update(userSettings).set({ ...safe, updatedAt: new Date() }).where(eq(userSettings.ownerId, ownerId));
    return { title: "Settings updated", detail: Object.keys(safe).join(", "), href: "/settings" };
  }

  throw new Error("That assistant action is not supported.");
}

export async function resolveAssistantAction(ownerId: string, requestId: number, decision: "approve" | "reject") {
  const request = (await db.select().from(assistantActionRequests).where(and(eq(assistantActionRequests.id, requestId), eq(assistantActionRequests.ownerId, ownerId), eq(assistantActionRequests.status, "pending"))).limit(1))[0];
  if (!request) throw new Error("Confirmation request not found.");
  if (decision === "reject") {
    await db.update(assistantActionRequests).set({ status: "rejected", resolvedAt: new Date() }).where(eq(assistantActionRequests.id, requestId));
    return { title: "Action cancelled", detail: request.summary };
  }
  const result = await runAssistantAction(ownerId, request.threadId, request.action, request.arguments as Record<string, unknown>, true);
  await db.update(assistantActionRequests).set({ status: "approved", result, resolvedAt: new Date() }).where(eq(assistantActionRequests.id, requestId));
  return result;
}

export async function runAssistantChat(ownerId: string, threadId: number, timezone: string) {
  const settings = await getUserSettings(ownerId);
  if (!settings.aiProcessingEnabled) throw new Error("AI processing is disabled in Settings.");
  if (!process.env.GEMINI_API_KEY) throw new Error("AI Assistant is not configured. Add GEMINI_API_KEY.");
  const messages = await db.select().from(assistantMessages).where(and(eq(assistantMessages.threadId, threadId), eq(assistantMessages.ownerId, ownerId))).orderBy(desc(assistantMessages.createdAt)).limit(24);
  const history = messages.reverse().map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n");
  const tools = assistantTools.map((tool) => `${tool.name}: ${tool.description} Args schema: ${JSON.stringify(tool.parameters)}`).join("\n");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const results: AssistantResult[] = [];
  let context = history;

  for (let step = 0; step < 4; step += 1) {
    const response = await ai.models.generateContent({
      model: settings.aiModel,
      contents: `You are Taskara's central productivity assistant. Be ${settings.aiTone.toLowerCase()} and ${settings.aiBehavior}. Current date/time is ${new Date().toISOString()}; user's IANA timezone is ${timezone || "UTC"}.
Use tools for workspace facts and actions. Never invent ids. Search first when a named target lacks an id. Ask one concise clarification question when required information is missing. Never offer delete/archive/clear actions.
Return ONLY JSON: {"reply":"text to user","tool":null} or {"reply":"brief progress text","tool":{"name":"tool_name","arguments":{}}}.
Available tools:
${tools}

Conversation and tool results:
${context}`,
      config: { responseMimeType: "application/json" },
    });
    const parsed = JSON.parse(response.text || "{}") as { reply?: string; tool?: { name?: string; arguments?: Record<string, unknown> } | null };
    if (!parsed.tool?.name) {
      return { reply: parsed.reply?.trim() || "I’m ready when you are.", results };
    }
    try {
      const result = await runAssistantAction(ownerId, threadId, parsed.tool.name, parsed.tool.arguments || {});
      results.push(result);
      context += `\nTOOL ${parsed.tool.name} RESULT: ${JSON.stringify(result)}`;
    } catch (error) {
      context += `\nTOOL ${parsed.tool.name} ERROR: ${error instanceof Error ? error.message : "Action failed"}`;
    }
  }
  return { reply: "I completed what I could, but I need a little more direction before continuing.", results };
}

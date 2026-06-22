export const assistantTools = [
  ["search_workspace", "Search accessible boards, columns, notes, spaces, and pages.", { query: "string" }, ["query"]],
  ["create_board", "Create a Kanban board after the user gives a name.", { name: "string", color: "string" }, ["name"]],
  ["create_task", "Create a Kanban task after required details are known.", { columnId: "number", title: "string", description: "string", dueDate: "string", priority: ["low", "medium", "high"] }, ["columnId", "title", "dueDate"]],
  ["create_calendar_item", "Create a calendar task or reminder after required details are known.", { title: "string", kind: ["task", "reminder"], description: "string", scheduledDate: "string", scheduledTime: "string" }, ["title", "kind"]],
  ["create_note", "Create a note.", { title: "string", content: "string" }, ["title"]],
  ["summarize_note", "Read a note so you can summarize it.", { noteId: "number" }, ["noteId"]],
  ["refine_note", "Propose replacing note content; requires confirmation.", { noteId: "number", title: "string", content: "string" }, ["noteId", "content"]],
  ["create_whiteboard_diagram", "Create a whiteboard diagram.", { name: "string", prompt: "string" }, ["name", "prompt"]],
  ["create_space_page", "Create a custom page in a Space.", { spaceId: "number", title: "string", description: "string", content: "string" }, ["spaceId", "title", "content"]],
  ["update_settings", "Propose changing settings; requires confirmation.", { changes: "object" }, ["changes"]],
].map(([name, description, properties, required]) => ({
  type: "function",
  name,
  description,
  execution_mode: "interactive",
  parameters: {
    type: "object",
    properties: Object.fromEntries(Object.entries(properties as Record<string, string | string[]>).map(([key, type]) => [key, Array.isArray(type) ? { type: "string", enum: type } : { type }])),
    required,
  },
}));

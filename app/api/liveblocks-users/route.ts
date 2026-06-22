import { inArray } from "drizzle-orm";
import { db, users } from "@/db";
import { currentActor, normalizeEmail } from "@/lib/kanban-access";

function userColor(email: string) {
  const colors = ["#2563eb", "#7c3aed", "#db2777", "#0f766e", "#d97706", "#dc2626"];
  return colors[[...email].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length];
}

export async function GET(request: Request) {
  try {
    await currentActor();
    const ids = new URL(request.url).searchParams.get("userIds")?.split(",").map(normalizeEmail).slice(0, 100) ?? [];
    const rows = ids.length ? await db.select().from(users).where(inArray(users.email, ids)) : [];
    return Response.json(ids.map((id) => {
      const user = rows.find((row) => normalizeEmail(row.email) === id);
      return { name: user?.name || id, email: id, avatar: user?.avatarUrl || undefined, color: userColor(id) };
    }));
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}

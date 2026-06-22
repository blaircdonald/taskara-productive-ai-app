import { currentActor } from "@/lib/kanban-access";
import { liveblocks, liveblocksConfigured } from "@/lib/liveblocks-server";

function userColor(email: string) {
  const colors = ["#2563eb", "#7c3aed", "#db2777", "#0f766e", "#d97706", "#dc2626"];
  return colors[[...email].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length];
}

export async function POST() {
  try {
    if (!liveblocksConfigured) return new Response("Liveblocks is not configured", { status: 503 });
    const actor = await currentActor();
    const { body, status } = await liveblocks.identifyUser(
      { userId: actor.email, groupIds: [] },
      { userInfo: { name: actor.name, email: actor.email, avatar: actor.avatar, color: userColor(actor.email) } },
    );
    return new Response(body, { status });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}

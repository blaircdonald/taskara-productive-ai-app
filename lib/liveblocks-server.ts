import "server-only";

import { Liveblocks } from "@liveblocks/node";

export const liveblocksConfigured = Boolean(process.env.LIVEBLOCKS_SECRET_KEY);

export const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY || "sk_prod_placeholder",
});

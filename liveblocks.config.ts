declare global {
  interface Liveblocks {
    Presence: Record<string, never>;
    UserMeta: {
      id: string;
      info: { name: string; email: string; avatar?: string; color: string };
    };
    RoomEvent: { type: "BOARD_UPDATED" };
    ThreadMetadata: { taskId: number };
  }
}

export {};

import { createTRPCRouter } from "#src/trpc";

import { list } from "./list";
import { markAllRead } from "./markAllRead";
import { markRead } from "./markRead";
import { unreadCount } from "./unreadCount";

export const notificationsRouter = createTRPCRouter({
  list,
  unreadCount,
  markRead,
  markAllRead,
});

import { createTRPCRouter } from "#src/trpc";

import { list } from "./list";
import { markAllRead } from "./markAllRead";
import { markRead } from "./markRead";
import { unreadCount } from "./unreadCount";
import { waitingRequests } from "./waitingRequests";

export const notificationsRouter = createTRPCRouter({
  list,
  unreadCount,
  markRead,
  markAllRead,
  waitingRequests,
});

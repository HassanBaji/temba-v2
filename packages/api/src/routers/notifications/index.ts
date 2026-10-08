import { createTRPCRouter } from "#src/trpc";

import { list } from "./list";
import { unreadCount } from "./unreadCount";

export const notificationsRouter = createTRPCRouter({
  list,
  unreadCount,
});

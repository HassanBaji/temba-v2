import { createTRPCRouter } from "~/server/api/trpc";

import { me } from "./me";
import { selfDeclare } from "./selfDeclare";

export const ratingsRouter = createTRPCRouter({
  me,
  selfDeclare,
});

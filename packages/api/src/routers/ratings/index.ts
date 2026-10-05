import { createTRPCRouter } from "#src/trpc";

import { me } from "./me";
import { selfDeclare } from "./selfDeclare";

export const ratingsRouter = createTRPCRouter({
  me,
  selfDeclare,
});

import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";

import type { AppRouter } from "#src/root";

export type {
  InviteHostKind,
  LookupListItem,
  LookupUserSearchRow,
} from "#src/invites/doors";
export type { AppRouter };
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

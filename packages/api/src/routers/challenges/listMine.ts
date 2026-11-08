import { protectedProcedure } from "#src/trpc";

/** Nothing can be posted or proposed yet, so both segments count zero. */
export function listMine() {
  return { counts: { open: 0, mine: 0 } };
}

export const listMineProcedure = protectedProcedure.query(() => listMine());

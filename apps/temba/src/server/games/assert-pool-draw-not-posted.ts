import { TRPCError } from "@trpc/server";

export const POOL_DRAW_POSTED_MESSAGE = "The groups are drawn";

export function isPoolDrawPosted(game: { drawPostedAt: Date | null }) {
  return game.drawPostedAt != null;
}

export function assertPoolDrawNotPosted(game: { drawPostedAt: Date | null }) {
  if (isPoolDrawPosted(game)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: POOL_DRAW_POSTED_MESSAGE,
    });
  }
}

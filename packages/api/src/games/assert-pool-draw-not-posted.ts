import { TRPCError } from "@trpc/server";

export function isPoolDrawPosted(game: { drawPostedAt: Date | null }) {
  return game.drawPostedAt != null;
}

export function assertPoolDrawNotPosted(game: { drawPostedAt: Date | null }) {
  if (isPoolDrawPosted(game)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "The groups are drawn",
    });
  }
}

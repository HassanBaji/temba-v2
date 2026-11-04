export function gameRates(game: {
  rated: boolean;
  cancelledAt: Date | null;
}): boolean {
  return game.rated && game.cancelledAt === null;
}

/** Whether a completed Match on this Game moves its Group's Group Levels. */
export function gameRatesGroup(game: {
  groupRated: boolean;
  groupId: string | null;
  cancelledAt: Date | null;
}): boolean {
  return game.groupRated && game.groupId !== null && game.cancelledAt === null;
}

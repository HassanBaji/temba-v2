export function gameRates(game: {
  rated: boolean;
  cancelledAt: Date | null;
}): boolean {
  return game.rated && game.cancelledAt === null;
}

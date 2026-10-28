export const FOOTBALL_SIDE_SIZES = [5, 6, 7, 8, 9, 11] as const;

export type FootballSideSize = (typeof FOOTBALL_SIDE_SIZES)[number];

export const DEFAULT_FOOTBALL_SIDE_SIZE: FootballSideSize = 5;

export const FOOTBALL_PLAYERS_ALLOWED_MAX = 40;

export const ROSTER_GAME_NO_SEATS_MESSAGE =
  "This Game has no seats; register as yourself";

export type GameShape = {
  format: string;
  sport?: string | null;
};

export function isFootballGame(game: Pick<GameShape, "sport">) {
  return game.sport === "football";
}

export function isRosterRegistrationGame(game: GameShape) {
  return (
    game.format === "americano" ||
    (game.format === "friendly_game" && isFootballGame(game))
  );
}

export function isFootballSideSize(value: unknown): value is FootballSideSize {
  return (FOOTBALL_SIDE_SIZES as readonly unknown[]).includes(value);
}

export function footballPlayersAllowedBounds(sideSize: number) {
  return { min: 2 * sideSize, max: FOOTBALL_PLAYERS_ALLOWED_MAX };
}

export function sideSizeLabel(sideSize: number) {
  return `${sideSize}-a-side`;
}

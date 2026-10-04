export const GAME_FORMAT_LABELS = {
  friendly_game: "Friendly game",
  americano: "Americano",
  friendly_tournament: "Friendly tournament",
} as const;

export function gameFormatLabel(format: string): string {
  if (format in GAME_FORMAT_LABELS) {
    return GAME_FORMAT_LABELS[format as keyof typeof GAME_FORMAT_LABELS];
  }
  return format.replaceAll("_", " ");
}

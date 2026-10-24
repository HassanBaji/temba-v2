import type { Sport } from "./sport";

export const COURT_SPORT_LABELS: Record<Sport, string> = {
  padel: "Padel",
  football: "Football",
};

export function courtFace(sport: Sport): "court" | "pitch" {
  return sport === "football" ? "pitch" : "court";
}

export function courtCountLabel(count: number, sport: Sport) {
  const face = courtFace(sport);
  const noun = count === 1 ? face : face === "pitch" ? "pitches" : "courts";
  return `${count} ${noun}`;
}

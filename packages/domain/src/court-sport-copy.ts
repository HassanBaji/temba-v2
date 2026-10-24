import { SPORT_LABELS, type Sport } from "./sport";

export const COURT_SPORT_LABELS = SPORT_LABELS;

export function courtFace(sport: Sport): "court" | "pitch" {
  return sport === "football" ? "pitch" : "court";
}

export function courtCountLabel(count: number, sport: Sport) {
  const face = courtFace(sport);
  const noun = count === 1 ? face : face === "pitch" ? "pitches" : "courts";
  return `${count} ${noun}`;
}

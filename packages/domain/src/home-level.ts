import {
  levelChangeView,
  parseLevelHistory,
  type LevelChangeDirection,
} from "./home-level-chart";
import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
  type LevelBand,
} from "./level-bands";

export type HomeLevelInput = {
  band: LevelBand;
  level: string;
  provisional: boolean;
  ratedMatchesRemaining: number;
  history: readonly string[];
  progressPercent: number | null;
};

export type HomeLevelView = {
  displayBand: string;
  level: string;
  change: {
    direction: LevelChangeDirection;
    amount: string;
    spoken: string;
    windowLabel: string;
  } | null;
  provisional: boolean;
  progress: { percent: number; label: string } | null;
  legend: { lead: string; rest: string };
};

export function homeLevelView(input: HomeLevelInput): HomeLevelView {
  const parsed = parseLevelHistory(input.history);
  const matchCount = parsed?.matchCount ?? 0;
  const change =
    parsed && matchCount > 0
      ? {
          ...levelChangeView(parsed.delta),
          windowLabel:
            matchCount === 1 ? "last 1 match" : `last ${matchCount} matches`,
        }
      : null;

  const next = nextDistinctDisplayRung(input.band);
  const percent = Math.min(100, Math.max(0, input.progressPercent ?? 0));

  const remaining = input.ratedMatchesRemaining;
  const legend = input.provisional
    ? {
        lead: "Provisional Level.",
        rest: ` Hatched means unconfirmed — play about ${remaining} more rated ${remaining === 1 ? "game" : "games"} and your Level confirms.`,
      }
    : {
        lead: "Level confirmed.",
        rest: " Your Level now moves with every rated game you play.",
      };

  return {
    displayBand: displayLabelFromStoredBand(input.band),
    level: input.level,
    change,
    provisional: input.provisional,
    progress:
      next == null
        ? null
        : { percent, label: `${percent}% of the way to ${next}` },
    legend,
  };
}

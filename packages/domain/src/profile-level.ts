import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
  type LevelBand,
} from "./level-bands";

export function confirmationFraction(
  ratedMatchCount: number,
  ratedMatchesRemaining: number,
): number {
  const denom = ratedMatchCount + ratedMatchesRemaining;
  if (denom <= 0) {
    return 0;
  }
  return ratedMatchCount / denom;
}

export function confirmationProgressCaption(
  ratedMatchCount: number,
  ratedMatchesRemaining: number,
): string {
  const total = ratedMatchCount + ratedMatchesRemaining;
  const noun = total === 1 ? "rated game" : "rated games";
  return `${ratedMatchCount} of about ${total} ${noun} to confirm`;
}

export type LastMatchMovement = "up" | "down" | "held";

export function lastMatchMovement(
  history: readonly string[],
): LastMatchMovement | null {
  if (history.length < 2) {
    return null;
  }
  const previous = Number.parseFloat(history[history.length - 2] ?? "");
  const latest = Number.parseFloat(history[history.length - 1] ?? "");
  if (Number.isNaN(previous) || Number.isNaN(latest)) {
    return null;
  }
  const previousDisplay = Number(previous.toFixed(1));
  const latestDisplay = Number(latest.toFixed(1));
  if (latestDisplay > previousDisplay) {
    return "up";
  }
  if (latestDisplay < previousDisplay) {
    return "down";
  }
  return "held";
}

export type ProfileLevelInput = {
  band: LevelBand;
  level: string;
  provisional: boolean;
  ratedMatchCount: number;
  ratedMatchesRemaining: number;
  progressPercent: number | null;
  history: readonly string[];
};

export type ProfileLevelView = {
  displayBand: string;
  level: string;
  provisional: boolean;
  movement: LastMatchMovement | null;
  atTopBand: boolean;
  fillPercent: number;
  caption: string;
};

export function profileLevelView(input: ProfileLevelInput): ProfileLevelView {
  const displayNext = nextDistinctDisplayRung(input.band);
  const fillPercent = clampPercent(
    input.provisional
      ? confirmationFraction(
          input.ratedMatchCount,
          input.ratedMatchesRemaining,
        ) * 100
      : (input.progressPercent ?? 0),
  );
  const progressCaption =
    displayNext == null
      ? "Top Level band"
      : `${Math.round(fillPercent)}% of the way to ${displayNext}`;

  return {
    displayBand: displayLabelFromStoredBand(input.band),
    level: input.level,
    provisional: input.provisional,
    movement: lastMatchMovement(input.history),
    atTopBand: !input.provisional && displayNext == null,
    fillPercent,
    caption: input.provisional
      ? confirmationProgressCaption(
          input.ratedMatchCount,
          input.ratedMatchesRemaining,
        )
      : progressCaption,
  };
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

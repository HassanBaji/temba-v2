import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatOvr } from "./football-ovr";
import {
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
  type LevelBand,
} from "./level-bands";
import type { Sport } from "./sport";

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
  locale: Locale,
): string {
  const total = ratedMatchCount + ratedMatchesRemaining;
  return messagesFor(locale).profile.level.confirmProgress(
    ratedMatchCount,
    total,
  );
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
  /** Padel unless asked. Football reads its Level as OVR. */
  sport?: Sport;
  /** The whole-number OVR, on football. */
  ovr?: number | null;
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
  /** "Down after the last match", null without a previous point. */
  movementLabel: string | null;
  atTopBand: boolean;
  fillPercent: number;
  caption: string;
};

export function profileLevelView(
  input: ProfileLevelInput,
  locale: Locale,
): ProfileLevelView {
  const m = messagesFor(locale).profile.level;
  const level =
    input.sport === "football" && input.ovr != null
      ? formatOvr(input.ovr)
      : input.level;
  if (input.sport === "football" && input.ratedMatchCount === 0) {
    return {
      displayBand: displayLabelFromStoredBand(input.band),
      level,
      provisional: true,
      movement: null,
      movementLabel: null,
      atTopBand: false,
      fillPercent: 0,
      caption: m.footballStartingCaption,
    };
  }
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
      ? m.topBand
      : m.progressTo(Math.round(fillPercent), displayNext);

  const movement = lastMatchMovement(input.history);

  return {
    displayBand: displayLabelFromStoredBand(input.band),
    level,
    provisional: input.provisional,
    movement,
    movementLabel: movement ? m.movement[movement] : null,
    atTopBand: !input.provisional && displayNext == null,
    fillPercent,
    caption: input.provisional
      ? confirmationProgressCaption(
          input.ratedMatchCount,
          input.ratedMatchesRemaining,
          locale,
        )
      : progressCaption,
  };
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, value));
}

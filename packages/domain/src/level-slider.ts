import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { bandFromLevel } from "./level";
import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  displayLabelFromStoredBand,
  LEVEL_BANDS,
  type AssignableDisplayLevelBand,
} from "./level-bands";
import {
  LEVEL_BAND_MIN_TENTHS,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
  tenthsToLevelBand,
} from "./level-range";
import { levelFromOvr, OVR_MAX, OVR_MIN, ovrFromLevel } from "./football-ovr";
import { shortPlayerName } from "./player-name";
import { formatPastDay } from "./request-meta";

export type LevelSliderRung = {
  label: AssignableDisplayLevelBand;
  lowerTenths: number;
  upperTenths: number;
};

function lowerTenthsOf(label: AssignableDisplayLevelBand): number {
  return Math.min(
    ...LEVEL_BANDS.filter(
      (band) => displayLabelFromStoredBand(band) === label,
    ).map((band) => LEVEL_BAND_MIN_TENTHS[band]),
  );
}

const RUNGS: readonly LevelSliderRung[] = ASSIGNABLE_DISPLAY_LEVEL_BANDS.map(
  (label, index) => {
    const next = ASSIGNABLE_DISPLAY_LEVEL_BANDS[index + 1];
    return {
      label,
      lowerTenths: lowerTenthsOf(label),
      upperTenths: next ? lowerTenthsOf(next) : LEVEL_TENTHS_MAX,
    };
  },
);

export const LEVEL_SLIDER_TICKS = {
  edgesTenths: RUNGS.slice(1).map((rung) => rung.lowerTenths),
  letters: RUNGS.map((rung) => ({
    label: rung.label,
    centreTenths: Math.round((rung.lowerTenths + rung.upperTenths) / 2),
  })),
  startLabel: "0.0",
  endLabel: "7.0",
};

export function clampLevelTenths(value: number): number {
  const rounded = Math.round(value);
  return Math.min(LEVEL_TENTHS_MAX, Math.max(LEVEL_TENTHS_MIN, rounded));
}

/** A member with no Level yet starts from the default placement, 3.0. */
export const LEVEL_SLIDER_DEFAULT_TENTHS = 30;

/** Where the slider starts for a member whose Level reads `level` ("3.2"). */
export function levelSliderStartTenths(level: string | null): number {
  return level
    ? clampLevelTenths(Number(level) * 10)
    : LEVEL_SLIDER_DEFAULT_TENTHS;
}

function formatTenths(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

function rungForTenths(tenths: number): LevelSliderRung {
  const label = displayLabelFromStoredBand(tenthsToLevelBand(tenths));
  return RUNGS.find((rung) => rung.label === label) ?? RUNGS[0]!;
}

export function levelSliderLabel(tenths: number): string {
  const clamped = clampLevelTenths(tenths);
  return `${rungForTenths(clamped).label} ${formatTenths(clamped)}`;
}

export function levelSliderReadout(args: {
  tenths: number;
  currentTenths: number;
  locale: Locale;
}) {
  const tenths = clampLevelTenths(args.tenths);
  const delta = tenths - clampLevelTenths(args.currentTenths);
  const rung = rungForTenths(tenths);
  const next = RUNGS[RUNGS.indexOf(rung) + 1];
  const span = rung.upperTenths - rung.lowerTenths;

  let deltaLabel = formatTenths(0);
  if (delta > 0) {
    deltaLabel = `+${formatTenths(delta)}`;
  } else if (delta < 0) {
    deltaLabel = `−${formatTenths(-delta)}`;
  }

  return {
    displayBand: rung.label,
    levelLabel: formatTenths(tenths),
    deltaLabel: messagesFor(args.locale).common.isolate(deltaLabel),
    rung: {
      label: rung.label,
      lowerTenths: rung.lowerTenths,
      upperTenths: rung.upperTenths,
      lowerLabel: formatTenths(rung.lowerTenths),
      upperLabel: formatTenths(rung.upperTenths),
    },
    percentThroughRung: Math.round(((tenths - rung.lowerTenths) / span) * 100),
    toNext: next
      ? {
          label: next.label,
          distanceLabel: formatTenths(rung.upperTenths - tenths),
        }
      : null,
  };
}

/** The OVR at a rung's lower edge, usually between two whole numbers. */
function rungLowerOvr(rung: LevelSliderRung) {
  return ovrFromLevel(rung.lowerTenths / 10);
}

function rungUpperOvr(rung: LevelSliderRung) {
  return ovrFromLevel(rung.upperTenths / 10);
}

/** The first whole OVR in a rung. */
function firstOvrOf(rung: LevelSliderRung) {
  return Math.ceil(rungLowerOvr(rung));
}

/** The last whole OVR in a rung: the top rung keeps 99. */
function lastOvrOf(rung: LevelSliderRung) {
  return rung === RUNGS[RUNGS.length - 1]
    ? OVR_MAX
    : Math.ceil(rungUpperOvr(rung)) - 1;
}

/** The OVR slider's marks: football's face of the same letters (ADR-0069). */
export const OVR_SLIDER_TICKS = {
  edges: RUNGS.slice(1).map(rungLowerOvr),
  letters: RUNGS.map((rung) => ({
    label: rung.label,
    centre: (rungLowerOvr(rung) + rungUpperOvr(rung)) / 2,
  })),
  startLabel: String(OVR_MIN),
  endLabel: String(OVR_MAX),
};

export function clampOvrInput(value: number): number {
  return Math.min(OVR_MAX, Math.max(OVR_MIN, Math.round(value)));
}

/** Where the OVR slider starts: the member's OVR, or Level 3.0's without one. */
export function ovrSliderStart(ovr: string | null): number {
  return clampOvrInput(
    ovr ? Number(ovr) : ovrFromLevel(LEVEL_SLIDER_DEFAULT_TENTHS / 10),
  );
}

/** The rung a whole OVR stores into, by the same band table the server uses. */
function rungForOvr(ovr: number): LevelSliderRung {
  const label = displayLabelFromStoredBand(bandFromLevel(levelFromOvr(ovr)));
  return RUNGS.find((rung) => rung.label === label) ?? RUNGS[0]!;
}

/** `C+ 72`. */
export function ovrSliderLabel(ovr: number): string {
  const clamped = clampOvrInput(ovr);
  return `${rungForOvr(clamped).label} ${clamped}`;
}

/** The readout of the OVR slider, in the shape of `levelSliderReadout`. */
export function ovrSliderReadout(args: {
  ovr: number;
  currentOvr: number;
  locale: Locale;
}) {
  const ovr = clampOvrInput(args.ovr);
  const delta = ovr - clampOvrInput(args.currentOvr);
  const rung = rungForOvr(ovr);
  const next = RUNGS[RUNGS.indexOf(rung) + 1];
  const lower = rungLowerOvr(rung);
  const span = rungUpperOvr(rung) - lower;

  let deltaLabel = "0";
  if (delta > 0) {
    deltaLabel = `+${delta}`;
  } else if (delta < 0) {
    deltaLabel = `−${-delta}`;
  }

  return {
    displayBand: rung.label,
    levelLabel: String(ovr),
    deltaLabel: messagesFor(args.locale).common.isolate(deltaLabel),
    rung: {
      label: rung.label,
      lowerLabel: String(firstOvrOf(rung)),
      upperLabel: String(lastOvrOf(rung)),
    },
    percentThroughRung: Math.min(
      100,
      Math.max(0, Math.round(((ovr - lower) / span) * 100)),
    ),
    toNext: next
      ? {
          label: next.label,
          distanceLabel: String(firstOvrOf(next) - ovr),
        }
      : null,
  };
}

export const LEVEL_OVERRIDE_REASONS = [
  "new_to_group",
  "plays_above_results",
  "plays_below_results",
  "back_from_injury",
  "correcting_a_mistake",
] as const;

export type LevelOverrideReason = (typeof LEVEL_OVERRIDE_REASONS)[number];

export function levelOverrideReasonLabel(
  reason: LevelOverrideReason,
  locale: Locale,
): string {
  const m = messagesFor(locale).level.overrideReason;
  switch (reason) {
    case "new_to_group":
      return m.newToGroup;
    case "plays_above_results":
      return m.playsAboveResults;
    case "plays_below_results":
      return m.playsBelowResults;
    case "back_from_injury":
      return m.backFromInjury;
    case "correcting_a_mistake":
      return m.correctingAMistake;
  }
}

/** The longest note a Level override keeps (ADR-0073). */
export const LEVEL_OVERRIDE_NOTE_MAX = 280;

/**
 * Why a Level was set, as the player reads it: the reason, with the setter's
 * note when there is one. An override from before reasons were required reads
 * "No reason given".
 */
export function levelOverrideWhy(args: {
  reason: LevelOverrideReason | null;
  note?: string | null;
  locale: Locale;
}): string {
  const m = messagesFor(args.locale);
  if (!args.reason) {
    return m.level.noReasonGiven;
  }
  const label = levelOverrideReasonLabel(args.reason, args.locale);
  return args.note
    ? m.level.overrideWhyWithNote(label, m.common.isolate(args.note))
    : label;
}

/** `Set by you, today` or `Set by Sara K, 3 days ago`. */
export function levelOverrideCaption(args: {
  setByIsViewer: boolean;
  setByName: string;
  createdAt: Date | string;
  locale: Locale;
  now?: Date;
}): string {
  const m = messagesFor(args.locale).level;
  const who = args.setByIsViewer
    ? m.overrideByYou
    : shortPlayerName(args.setByName);
  return m.overrideCaption(
    who,
    formatPastDay(args.createdAt, args.locale, args.now),
  );
}

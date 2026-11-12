import { footballRoleView } from "@repo/domain/player-profile-football";
import type {
  FootballPosition,
  FootballRole,
} from "@repo/domain/football-lineup";
import type { LevelBand } from "@repo/domain/level";
import { preferredPositionProfileLine } from "@repo/domain/preferred-position";
import {
  ageGroupLabel,
  ageOn,
  birthDateProblem,
  PLAY_WINDOW_DAYS,
  PLAY_WINDOW_PARTS,
  PLAY_WINDOWS,
  playWindow,
  type PlayWindow,
} from "@repo/domain/profile-details";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { displayBand, footballLevelWord } from "../profile/profile-model";

/** Others see an age group; Your details counts as done once these are set. */
export function hasDetails(details: {
  gender: string | null;
  birthDate: string | null;
  homeArea: string | null;
}): boolean {
  return (
    details.gender != null &&
    details.birthDate != null &&
    details.homeArea != null
  );
}

/** "C+ 3.21 general · Left side", or "No level yet · Left side". */
export function padelSportSub(
  level: { levelBand: LevelBand; rating: number } | null,
  preferredPosition: string | null,
  locale: Locale,
): string {
  const m = messagesFor(locale);
  const side =
    preferredPositionProfileLine(preferredPosition, locale) ?? m.common.notSet;
  return level
    ? m.you.settings.padelSub(
        `${displayBand(level.levelBand)} ${level.rating.toFixed(2)}`,
        side,
      )
    : m.you.settings.padelSubNoLevel(side);
}

/** "Competitive · Midfield". */
export function footballSportSub(
  levelBand: LevelBand | null,
  role: { role: FootballRole | null; position: FootballPosition | null },
  locale: Locale,
): string {
  const m = messagesFor(locale);
  const level = levelBand
    ? footballLevelWord(levelBand, locale)
    : m.you.hero.noLevel;
  return m.you.settings.footballSub(
    level,
    footballRoleView(role, locale).label,
  );
}

export function togglePlayWindow(
  windows: readonly PlayWindow[],
  value: PlayWindow,
): PlayWindow[] {
  const next = windows.includes(value)
    ? windows.filter((window) => window !== value)
    : [...windows, value];
  return PLAY_WINDOWS.filter((window) => next.includes(window));
}

/** Rows weekday and weekend, columns morning, afternoon, evening. */
export function playWindowGrid(windows: readonly PlayWindow[], locale: Locale) {
  const m = messagesFor(locale).you.playWindows;
  return PLAY_WINDOW_DAYS.map((day) => ({
    day,
    label: m.days[day],
    cells: PLAY_WINDOW_PARTS.map((part) => {
      const value = playWindow(day, part);
      return {
        value,
        on: windows.includes(value),
        spoken: m.cellSpoken(m.days[day], m.parts[part]),
      };
    }),
  }));
}

export type BirthDateParts = { day: string; month: string; year: string };

export function birthDateParts(birthDate: string | null): BirthDateParts {
  const match = birthDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate) : null;
  return match
    ? { year: match[1] ?? "", month: match[2] ?? "", day: match[3] ?? "" }
    : { day: "", month: "", year: "" };
}

export type BirthDateReading =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "valid"; value: string; othersSee: string };

/** Three fields to one `YYYY-MM-DD`, with the age group others see. */
export function readBirthDate(
  parts: BirthDateParts,
  today: string,
  locale: Locale,
): BirthDateReading {
  const day = parts.day.trim();
  const month = parts.month.trim();
  const year = parts.year.trim();
  if (!day && !month && !year) {
    return { kind: "empty" };
  }
  const m = messagesFor(locale).you.details;
  if (
    !/^\d{1,2}$/.test(day) ||
    !/^\d{1,2}$/.test(month) ||
    !/^\d{4}$/.test(year)
  ) {
    return { kind: "invalid", message: m.birthDateInvalid };
  }
  const value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const problem = birthDateProblem(value, today);
  if (problem) {
    return {
      kind: "invalid",
      message: problem === "tooYoung" ? m.tooYoung : m.birthDateInvalid,
    };
  }
  return {
    kind: "valid",
    value,
    othersSee: m.othersSee(ageGroupLabel(ageOn(value, today), locale)),
  };
}

export type FootballSavePlan =
  /** Saves role, position and Level through `users.completeOnboarding`, as the sports task does. */
  | { kind: "onboarding" }
  /** Saves role and position through `users.setFootballPreferences`, declares the Level when there is none and adds the sport. */
  | { kind: "direct"; declare: boolean; addSport: boolean };

/**
 * How the Football profile saves. Before onboarding is complete the sports
 * task's door takes every football answer at once and completes it. That
 * door would also declare padel when padel is picked without a Level, so
 * then, and once onboarding is complete, each answer goes through its own door.
 */
export function footballSavePlan(state: {
  setUp: boolean;
  onboardingComplete: boolean;
  sports: readonly string[];
  hasPadelRating: boolean;
  hasFootballRating: boolean;
}): FootballSavePlan {
  const padelNeedsDeclare =
    state.sports.includes("padel") && !state.hasPadelRating;
  if (!state.onboardingComplete && !padelNeedsDeclare) {
    return { kind: "onboarding" };
  }
  return {
    kind: "direct",
    declare: !state.hasFootballRating,
    addSport: !state.setUp,
  };
}

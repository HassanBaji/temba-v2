import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

import { formatAbsoluteDay } from "./format-game-start";
import { friendlyGameWaitlistLine } from "./friendly-game-cta";
import {
  cancelGameAction,
  joinGameAction,
  leaveGameAction,
  leaveWaitlistAction,
} from "./game-copy";
import { unratedLabel } from "./game-rating-impact";
import {
  FOOTBALL_PLAYERS_ALLOWED_MAX,
  footballPlayersAllowedBounds,
  sideSizeLabel,
} from "./game-shape";
import {
  formatHeroCountdown,
  formatHeroKickoffTrailer,
  formatHomeKickoff,
} from "./home-countdown";
import { formatPricePerPlayerFils } from "./price-per-player";
import type { SurfaceTone } from "./surface-tone";

type Person = { id: string; name: string; image: string | null };

export type FootballGameDetailsInput = {
  name: string | null;
  sideSize: number | null;
  playersAllowed: number | null;
  venue: { name: string; city: string | null } | null;
  recordedCourts: readonly { name: string }[];
  windowStart: Date | null;
  windowEnd: Date | null;
  pricePerPlayerFils: number | null;
  cancelledAt: Date | null;
  registrationClosedAt: Date | null;
  registrationStatus: string;
  rated: boolean;
  isOrganizer: boolean;
  viewerUserId: string;
  isRegistered: boolean;
  isWaitlisted: boolean;
  waitlistPlace: number | null;
  canRegister: boolean;
  canWaitlist: boolean;
  roster: { users: readonly Person[]; count: number; cap: number | null };
  waitlist: readonly (Person & { userId: string | null })[];
};

export function isFootballRosterGame(game: {
  sport?: string | null;
  roster?: unknown;
}) {
  return game.sport === "football" && game.roster != null;
}

export type FootballGameCta =
  | { kind: "join"; title: string; actionLabel: string }
  | { kind: "join_waitlist"; title: string; actionLabel: string }
  | { kind: "waitlisted"; title: string; actionLabel: string }
  | { kind: "registered"; title: string; actionLabel: string };

export type FootballRosterRow = Person & {
  place: number;
  isViewer: boolean;
  kickable: boolean;
};

export type FootballGameHero = {
  tone: SurfaceTone;
  dateLabel: string | null;
  statusLabel: string | null;
  kickoffTime: string | null;
  trailer: string | null;
  sizeLine: string;
  placeLine: string | null;
  figures: { key: string; value: string; label: string }[];
};

export type FootballGameDetailsModel = {
  title: string;
  hero: FootballGameHero;
  rosterRows: FootballRosterRow[];
  openSpots: number;
  waitlistRows: (Person & { userId: string | null })[];
  unratedLine: string;
  cta: FootballGameCta | null;
  organizer: {
    registration: "close" | "reopen";
    capBounds: { min: number; max: number };
    cancelLabel: string;
  } | null;
};

export function footballOccupancyLine(
  sideSize: number | null,
  count: number,
  cap: number | null,
  locale: Locale,
) {
  const occupancy = cap == null ? String(count) : `${count}/${cap}`;
  return sideSize == null
    ? occupancy
    : `${sideSizeLabel(sideSize, locale)} · ${occupancy}`;
}

function placeLine(input: FootballGameDetailsInput) {
  const parts = [
    input.venue?.name,
    ...input.recordedCourts.map((court) => court.name),
    input.venue?.city,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function durationFigure(start: Date | null, end: Date | null, locale: Locale) {
  if (!start || !end || end.getTime() <= start.getTime()) {
    return "—";
  }
  return messagesFor(locale).football.details.minutesShort(
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );
}

function heroTone(input: FootballGameDetailsInput, now: Date): SurfaceTone {
  const over =
    input.windowEnd != null && input.windowEnd.getTime() < now.getTime();
  return input.cancelledAt || over ? "paper" : "ink";
}

function heroModel(
  input: FootballGameDetailsInput,
  now: Date,
  locale: Locale,
): FootballGameHero {
  const m = messagesFor(locale).football;
  const start = input.windowStart;
  const over =
    input.windowEnd != null && input.windowEnd.getTime() < now.getTime();
  const kickoff = start ? formatHomeKickoff(start, locale) : null;
  return {
    tone: heroTone(input, now),
    dateLabel: start ? formatAbsoluteDay(start, locale) : null,
    statusLabel: input.cancelledAt
      ? m.status.cancelled
      : over
        ? m.status.played
        : start
          ? formatHeroCountdown(start, input.windowEnd, now, locale)
          : null,
    kickoffTime: kickoff?.time ?? null,
    trailer: start
      ? formatHeroKickoffTrailer(start, input.windowEnd, locale)
      : null,
    sizeLine: footballOccupancyLine(
      input.sideSize,
      input.roster.count,
      input.roster.cap ?? input.playersAllowed,
      locale,
    ),
    placeLine: placeLine(input),
    figures: [
      {
        key: "price",
        value:
          formatPricePerPlayerFils(input.pricePerPlayerFils, locale) ?? "—",
        label: m.details.priceLabel,
      },
      {
        key: "duration",
        value: durationFigure(start, input.windowEnd, locale),
        label: m.details.durationLabel,
      },
    ],
  };
}

export function footballGameCta(
  input: FootballGameDetailsInput,
  locale: Locale,
): FootballGameCta | null {
  const m = messagesFor(locale).football.details;
  if (input.cancelledAt) {
    return null;
  }
  if (input.isWaitlisted) {
    return {
      kind: "waitlisted",
      title:
        input.waitlistPlace != null
          ? friendlyGameWaitlistLine(input.waitlistPlace, locale)
          : m.waitlistedTitle,
      actionLabel: leaveWaitlistAction(locale),
    };
  }
  if (input.isRegistered) {
    return {
      kind: "registered",
      title: m.registeredTitle,
      actionLabel: leaveGameAction(locale),
    };
  }
  if (input.canRegister) {
    return {
      kind: "join",
      title: m.joinTitle,
      actionLabel: joinGameAction(locale),
    };
  }
  if (input.canWaitlist) {
    return {
      kind: "join_waitlist",
      title: m.fullTitle,
      actionLabel: m.joinWaitlistAction,
    };
  }
  return null;
}

export function footballGameDetailsModel(
  input: FootballGameDetailsInput,
  now: Date,
  locale: Locale,
): FootballGameDetailsModel {
  const organizerActive = input.isOrganizer && !input.cancelledAt;
  const cap = input.roster.cap ?? input.playersAllowed;
  const bounds = footballPlayersAllowedBounds(input.sideSize ?? 5);
  return {
    title:
      input.name ??
      input.venue?.name ??
      messagesFor(locale).football.details.fallbackTitle,
    hero: heroModel(input, now, locale),
    rosterRows: input.roster.users.map((user, index) => ({
      ...user,
      place: index + 1,
      isViewer: user.id === input.viewerUserId,
      kickable: organizerActive && user.id !== input.viewerUserId,
    })),
    openSpots: cap == null ? 0 : Math.max(0, cap - input.roster.count),
    waitlistRows: [...input.waitlist],
    unratedLine: unratedLabel(locale),
    cta: footballGameCta(input, locale),
    organizer: organizerActive
      ? {
          registration: input.registrationClosedAt ? "reopen" : "close",
          capBounds: { min: bounds.min, max: FOOTBALL_PLAYERS_ALLOWED_MAX },
          cancelLabel: cancelGameAction(locale),
        }
      : null,
  };
}

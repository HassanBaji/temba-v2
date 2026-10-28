import { formatAbsoluteDay } from "./format-game-start";
import { friendlyGameWaitlistLine } from "./friendly-game-cta";
import {
  CANCEL_GAME_ACTION,
  JOIN_GAME_ACTION,
  LEAVE_GAME_ACTION,
  LEAVE_WAITLIST_ACTION,
} from "./game-copy";
import { UNRATED_LABEL } from "./game-rating-impact";
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
  joinFrozen: boolean;
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
) {
  const occupancy = cap == null ? String(count) : `${count}/${cap}`;
  return sideSize == null
    ? occupancy
    : `${sideSizeLabel(sideSize)} · ${occupancy}`;
}

function placeLine(input: FootballGameDetailsInput) {
  const parts = [
    input.venue?.name,
    ...input.recordedCourts.map((court) => court.name),
    input.venue?.city,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function durationFigure(start: Date | null, end: Date | null) {
  if (!start || !end || end.getTime() <= start.getTime()) {
    return "—";
  }
  return `${Math.round((end.getTime() - start.getTime()) / 60_000)}m`;
}

function heroTone(input: FootballGameDetailsInput, now: Date): SurfaceTone {
  const over =
    input.windowEnd != null && input.windowEnd.getTime() < now.getTime();
  return input.cancelledAt || over ? "paper" : "ink";
}

function heroModel(
  input: FootballGameDetailsInput,
  now: Date,
): FootballGameHero {
  const start = input.windowStart;
  const over =
    input.windowEnd != null && input.windowEnd.getTime() < now.getTime();
  const kickoff = start ? formatHomeKickoff(start) : null;
  const live =
    start != null &&
    start.getTime() <= now.getTime() &&
    !over &&
    !input.cancelledAt;
  return {
    tone: heroTone(input, now),
    dateLabel: start ? formatAbsoluteDay(start) : null,
    statusLabel: input.cancelledAt
      ? "Cancelled"
      : over
        ? "Played"
        : start
          ? formatHeroCountdown(live ? "ongoing" : "upcoming", start, now)
          : null,
    kickoffTime: kickoff?.time ?? null,
    trailer: start ? formatHeroKickoffTrailer(start, input.windowEnd) : null,
    sizeLine: footballOccupancyLine(
      input.sideSize,
      input.roster.count,
      input.roster.cap ?? input.playersAllowed,
    ),
    placeLine: placeLine(input),
    figures: [
      {
        key: "price",
        value: formatPricePerPlayerFils(input.pricePerPlayerFils) ?? "—",
        label: "Price",
      },
      {
        key: "duration",
        value: durationFigure(start, input.windowEnd),
        label: "Duration",
      },
    ],
  };
}

export function footballGameCta(
  input: FootballGameDetailsInput,
): FootballGameCta | null {
  if (input.cancelledAt || input.joinFrozen) {
    return null;
  }
  if (input.isWaitlisted) {
    return {
      kind: "waitlisted",
      title:
        input.waitlistPlace != null
          ? friendlyGameWaitlistLine(input.waitlistPlace)
          : "You're on the Waitlist",
      actionLabel: LEAVE_WAITLIST_ACTION,
    };
  }
  if (input.isRegistered) {
    return {
      kind: "registered",
      title: "You're in",
      actionLabel: LEAVE_GAME_ACTION,
    };
  }
  if (input.canRegister) {
    return {
      kind: "join",
      title: "Join this Game",
      actionLabel: JOIN_GAME_ACTION,
    };
  }
  if (input.canWaitlist) {
    return {
      kind: "join_waitlist",
      title: "This Game is full",
      actionLabel: "Join waitlist",
    };
  }
  return null;
}

export function footballGameDetailsModel(
  input: FootballGameDetailsInput,
  now: Date,
): FootballGameDetailsModel {
  const organizerActive = input.isOrganizer && !input.cancelledAt;
  const cap = input.roster.cap ?? input.playersAllowed;
  const bounds = footballPlayersAllowedBounds(input.sideSize ?? 5);
  return {
    title: input.name ?? input.venue?.name ?? "Game",
    hero: heroModel(input, now),
    rosterRows: input.roster.users.map((user, index) => ({
      ...user,
      place: index + 1,
      isViewer: user.id === input.viewerUserId,
      kickable: organizerActive && user.id !== input.viewerUserId,
    })),
    openSpots: cap == null ? 0 : Math.max(0, cap - input.roster.count),
    waitlistRows: [...input.waitlist],
    unratedLine: UNRATED_LABEL,
    cta: footballGameCta(input),
    organizer: organizerActive
      ? {
          registration: input.registrationClosedAt ? "reopen" : "close",
          capBounds: {
            min: Math.max(bounds.min, input.roster.count),
            max: FOOTBALL_PLAYERS_ALLOWED_MAX,
          },
          cancelLabel: CANCEL_GAME_ACTION,
        }
      : null,
  };
}

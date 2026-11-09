import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  challengeTeamFaceLine,
  type ChallengeTeamFace,
} from "./challenge-detail";
import {
  CHALLENGE_TIMINGS,
  CHALLENGE_WEEKDAYS,
  isChallengeTiming,
  isChallengeWeekday,
} from "./challenge-form";
import { challengeSlotDays, type ChallengeSlotDay } from "./challenge-slots";
import {
  formatGameClock,
  formatGameStart,
  formatWeekday,
} from "./format-game-start";
import { initials } from "./initials";
import { shortPlayerName } from "./player-name";
import { zonedParts } from "./product-timezone";
import {
  filsToMajorInput,
  parseOptionalPricePerPlayerFils,
} from "./price-per-player";

type Instant = Date | string;

export type AcceptPendingProposal = {
  id: string;
  venueId: string;
  courtId: string | null;
  startsAt: Instant;
  pricePerPlayerFils: number | null;
};

/** What the Accept sheet reads from `challenges.listProposeOptions`. */
export type AcceptOptions = {
  posterTeam: { displayName: string };
  sport?: string;
  days?: readonly string[];
  timings?: readonly string[];
  teams: readonly {
    id: string;
    displayName: string;
    face?: ChallengeTeamFace | null;
    pendingProposal: AcceptPendingProposal | null;
  }[];
  venues: readonly {
    id: string;
    name: string;
    preferred: boolean;
    courts: readonly { id: string; name: string }[];
  }[];
  slots: readonly Instant[];
};

export type AcceptDraft = {
  teamId: string | null;
  venueId: string | null;
  courtId: string | null;
  dayKey: string | null;
  startsAt: Date | null;
  price: string;
};

export type AcceptDraftField = "team" | "venue" | "slot" | "price";

export type AcceptSubmit =
  | {
      ok: true;
      /** Set when the Team already has a pending Proposal here: the sheet changes it. */
      proposalId: string | null;
      value: {
        teamId: string;
        venueId: string;
        courtId: string | null;
        startsAt: Date;
        pricePerPlayerFils: number | null;
      };
    }
  | { ok: false; errors: Partial<Record<AcceptDraftField, string>> };

function instant(value: Instant) {
  return value instanceof Date ? value : new Date(value);
}

function slotDays(options: AcceptOptions) {
  return challengeSlotDays(options.slots, "en");
}

function dayKeyOf(options: AcceptOptions, startsAt: Date | null) {
  if (!startsAt) {
    return null;
  }
  return (
    slotDays(options).find((day) =>
      day.slots.some((slot) => slot.startsAt.getTime() === startsAt.getTime()),
    )?.key ?? null
  );
}

/** The draft for one Team: its pending Proposal's terms, or the first preferred Venue and slot. */
export function acceptDraftForTeam(
  options: AcceptOptions,
  teamId: string | null,
): AcceptDraft {
  const team = options.teams.find((candidate) => candidate.id === teamId);
  const pending = team?.pendingProposal ?? null;
  if (pending) {
    const startsAt = instant(pending.startsAt);
    return {
      teamId: team?.id ?? null,
      venueId: pending.venueId,
      courtId: pending.courtId,
      dayKey: dayKeyOf(options, startsAt),
      startsAt,
      price: filsToMajorInput(pending.pricePerPlayerFils),
    };
  }
  const firstDay = slotDays(options)[0];
  return {
    teamId: team?.id ?? null,
    venueId: options.venues[0]?.id ?? null,
    courtId: null,
    dayKey: firstDay?.key ?? null,
    startsAt: null,
    price: "",
  };
}

export function initialAcceptDraft(
  options: AcceptOptions,
  teamId?: string | null,
): AcceptDraft {
  return acceptDraftForTeam(options, teamId ?? options.teams[0]?.id ?? null);
}

/** Picking another Venue clears a Court that belongs to the old one. */
export function acceptPickVenue(
  draft: AcceptDraft,
  venueId: string,
): AcceptDraft {
  return draft.venueId === venueId
    ? draft
    : { ...draft, venueId, courtId: null };
}

/** Picking the selected Court again clears it: a Court is optional. */
export function acceptPickCourt(
  draft: AcceptDraft,
  courtId: string,
): AcceptDraft {
  return { ...draft, courtId: draft.courtId === courtId ? null : courtId };
}

/** Picking another day clears a start on the old one. */
export function acceptPickDay(draft: AcceptDraft, dayKey: string): AcceptDraft {
  return draft.dayKey === dayKey ? draft : { ...draft, dayKey, startsAt: null };
}

export function acceptVenueChips(options: AcceptOptions, locale: Locale) {
  const m = messagesFor(locale).challenge.accept;
  return options.venues.map((venue) => ({
    value: venue.id,
    label: venue.name,
    accessibilityLabel: venue.preferred
      ? m.preferredVenue(venue.name)
      : venue.name,
    preferred: venue.preferred,
  }));
}

export function acceptCourts(options: AcceptOptions, venueId: string | null) {
  return (
    options.venues.find((venue) => venue.id === venueId)?.courts ?? []
  ).map((court) => ({ value: court.id, label: court.name }));
}

/** The day row; the time row is the picked day's `slots`. */
export function acceptSlotDays(
  options: AcceptOptions,
  locale: Locale,
): ChallengeSlotDay[] {
  return challengeSlotDays(options.slots, locale);
}

export function acceptPendingProposal(
  options: AcceptOptions,
  teamId: string | null,
) {
  return (
    options.teams.find((team) => team.id === teamId)?.pendingProposal ?? null
  );
}

/** "Send proposal to Seef Smashers". */
export function acceptCtaLabel(options: AcceptOptions, locale: Locale) {
  return messagesFor(locale).challenge.accept.send(
    options.posterTeam.displayName,
  );
}

export function validateAcceptDraft(
  draft: AcceptDraft,
  options: AcceptOptions,
  locale: Locale,
): AcceptSubmit {
  const m = messagesFor(locale).challenge.errors;
  const errors: Partial<Record<AcceptDraftField, string>> = {};
  const team = options.teams.find((candidate) => candidate.id === draft.teamId);
  if (!team) {
    errors.team = m.pickTeam;
  }
  const venue = options.venues.find(
    (candidate) => candidate.id === draft.venueId,
  );
  if (!venue) {
    errors.venue = m.pickVenue;
  }
  if (!draft.startsAt) {
    errors.slot = m.pickSlot;
  }
  const price = parseOptionalPricePerPlayerFils(draft.price, locale);
  if (!price.ok) {
    errors.price = price.message;
  }
  if (!team || !venue || !draft.startsAt || !price.ok) {
    return { ok: false, errors };
  }
  const courtId = venue.courts.some((court) => court.id === draft.courtId)
    ? draft.courtId
    : null;
  return {
    ok: true,
    proposalId: team.pendingProposal?.id ?? null,
    value: {
      teamId: team.id,
      venueId: venue.id,
      courtId,
      startsAt: draft.startsAt,
      pricePerPlayerFils: price.fils,
    },
  };
}

/** The first eligible Team with no pending Proposal here: Accept opens on it. */
export function acceptTeamToPropose<T extends { id: string }>(
  eligibleTeams: readonly T[],
  viewerProposals: readonly { team: { id: string } }[],
): T | null {
  return (
    eligibleTeams.find(
      (team) =>
        !viewerProposals.some((proposal) => proposal.team.id === team.id),
    ) ?? null
  );
}

/** The "Your team" cards: crest initials, name and "Padel, C+, you and Ali M". */
export function acceptTeamCards(options: AcceptOptions, locale: Locale) {
  return options.teams.map((team) => {
    const line = team.face
      ? challengeTeamFaceLine(team.face, locale, { withSport: true })
      : null;
    return {
      value: team.id,
      title: team.displayName,
      initials: initials(team.displayName),
      line,
      accessibilityLabel: line
        ? `${team.displayName}, ${line}`
        : team.displayName,
    };
  });
}

/** "Ali M is told when you propose, and again if they confirm." */
export function acceptToldLine(
  options: AcceptOptions,
  teamId: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.challenge.detailScreen.accept;
  const face = options.teams.find((team) => team.id === teamId)?.face;
  if (!face) {
    return null;
  }
  const others = face.members.filter((member) => !member.isViewer);
  if (others.length === 0) {
    return null;
  }
  if (others.length === 1 && face.rosterCount <= face.members.length) {
    return copy.toldOne(
      shortPlayerName(others[0]!.name ?? m.team.memberFallback),
    );
  }
  return copy.toldRoster;
}

export type AcceptVenueRow = {
  value: string;
  label: string;
  hint: string | null;
};

/**
 * The Venue list: the Challenge's preferred Venues as "their first", "their
 * second"; every other Venue sits behind "Somewhere else". With no preferred
 * Venue every Venue is a row.
 */
export function acceptVenueRows(
  options: AcceptOptions,
  locale: Locale,
): {
  hint: string | null;
  rows: AcceptVenueRow[];
  elsewhere: {
    label: string;
    hint: string;
    venues: { value: string; label: string }[];
  } | null;
} {
  const m = messagesFor(locale).challenge.detailScreen.accept;
  const preferred = options.venues.filter((venue) => venue.preferred);
  const others = options.venues.filter((venue) => !venue.preferred);
  if (preferred.length === 0) {
    return {
      hint: null,
      rows: others.map((venue) => ({
        value: venue.id,
        label: venue.name,
        hint: null,
      })),
      elsewhere: null,
    };
  }
  const hints = [m.theirFirst, m.theirSecond];
  return {
    hint: m.venueHint,
    rows: preferred.map((venue, index) => ({
      value: venue.id,
      label: venue.name,
      hint: hints[index] ?? m.theirPick,
    })),
    elsewhere:
      others.length === 0
        ? null
        : {
            label: m.somewhereElse,
            hint: m.youSuggest,
            venues: others.map((venue) => ({
              value: venue.id,
              label: venue.name,
            })),
          },
  };
}

/** Whether the picked Venue is one of "Somewhere else". */
export function acceptVenueIsElsewhere(
  options: AcceptOptions,
  venueId: string | null,
) {
  const venue = options.venues.find((candidate) => candidate.id === venueId);
  return (
    venue != null &&
    !venue.preferred &&
    options.venues.some((candidate) => candidate.preferred)
  );
}

/** "Tue or Thu evenings", "Evenings", "Tue or Thu", "Any day, any time". */
export function acceptTimeHint(options: AcceptOptions, locale: Locale) {
  const m = messagesFor(locale).challenge;
  const copy = m.detailScreen.accept;
  const days = CHALLENGE_WEEKDAYS.filter((day) =>
    (options.days ?? []).filter(isChallengeWeekday).includes(day),
  );
  const timings = CHALLENGE_TIMINGS.filter((timing) =>
    (options.timings ?? []).filter(isChallengeTiming).includes(timing),
  );
  const someDays =
    days.length > 0 && days.length < CHALLENGE_WEEKDAYS.length ? days : [];
  const someTimings =
    timings.length > 0 && timings.length < CHALLENGE_TIMINGS.length
      ? timings
      : [];
  const dayText = someDays.map((day) => m.weekdays[day]).join(copy.orSeparator);
  if (someDays.length > 0 && someTimings.length > 0) {
    return copy.daysTimings(
      dayText,
      someTimings
        .map((timing) => copy.timingsAfterDays[timing])
        .join(copy.orSeparator),
    );
  }
  if (someDays.length > 0) {
    return dayText;
  }
  if (someTimings.length > 0) {
    return someTimings
      .map((timing) => m.timings[timing])
      .join(copy.orSeparator);
  }
  return copy.anyTime;
}

function slotDayLabel(slot: Date, locale: Locale) {
  return messagesFor(locale).challenge.detailScreen.accept.slotDay(
    formatWeekday(slot, "short", locale),
    String(zonedParts(slot).day),
  );
}

/** The time grid: every suggested slot as "8:00 PM" over "Thu 12", soonest first. */
export function acceptSlotCells(options: AcceptOptions, locale: Locale) {
  return [...options.slots]
    .map(instant)
    .sort((a, b) => a.getTime() - b.getTime())
    .map((slot) => ({
      value: slot.getTime(),
      startsAt: slot,
      time: formatGameClock(slot, locale),
      day: slotDayLabel(slot, locale),
      accessibilityLabel: formatGameStart(slot, locale),
    }));
}

/** The grid shows two rows until "More times", or until the picked slot sits further down. */
export const ACCEPT_SLOT_PREVIEW = 6;

export function acceptPickSlot(
  draft: AcceptDraft,
  options: AcceptOptions,
  startsAt: Date,
): AcceptDraft {
  return { ...draft, startsAt, dayKey: dayKeyOf(options, startsAt) };
}

/** "Propose Thu 12, 8:00 PM at Padel Point Riffa", or "Propose" until both are picked. */
export function acceptProposeLabel(
  draft: AcceptDraft,
  options: AcceptOptions,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const copy = m.challenge.detailScreen.accept;
  const changing = acceptPendingProposal(options, draft.teamId) != null;
  const venue = options.venues.find(
    (candidate) => candidate.id === draft.venueId,
  );
  if (!draft.startsAt || !venue) {
    return changing ? copy.changeIncomplete : copy.proposeIncomplete;
  }
  const when = m.dates.gameStart(
    slotDayLabel(draft.startsAt, locale),
    formatGameClock(draft.startsAt, locale),
  );
  return changing
    ? copy.change(when, venue.name)
    : copy.propose(when, venue.name);
}

/** A Court or a price already on the draft opens the optional extras. */
export function acceptDraftHasExtras(draft: AcceptDraft) {
  return draft.courtId != null || draft.price.trim().length > 0;
}

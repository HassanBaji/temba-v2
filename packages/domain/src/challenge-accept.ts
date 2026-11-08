import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { challengeSlotDays, type ChallengeSlotDay } from "./challenge-slots";
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
  teams: readonly {
    id: string;
    displayName: string;
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

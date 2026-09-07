import { displayLabelFromStoredBand, type LevelBand } from "~/lib/level-bands";

/**
 * The phases the sticky bottom bar (and the rest of the redesigned game
 * details page) cares about (game-details redesign, TEM-183). Mirrors
 * `GameDetailsPhase` (`~/server/api/routers/games/byId.ts`) and the same
 * local duplication convention already used by
 * `FriendlyGameDetailsHeroPhase` (`friendly-game-details-hero.tsx`) and
 * `GameScoreSectionPhase` (`game-score-section.tsx`) rather than importing a
 * server-layer type into this shared lib. `"cancelled"` is included only so
 * callers can pass `byId.ts`'s `phase` field through unchanged — the
 * `cancelled` input below (derived from `cancelledAt`) is what actually
 * drives the cancelled branch.
 */
export type FriendlyGameCtaPhase =
  | "upcoming"
  | "ongoing"
  | "needs_results"
  | "final"
  | "cancelled";

export type FriendlyGameCtaFamily =
  | { kind: "browse" }
  | { kind: "join_waitlist" }
  | { kind: "waitlisted"; place: number }
  | { kind: "join" }
  | { kind: "upcoming"; vacantSeatCount: number; showInvite: boolean }
  | { kind: "needs_score" }
  | { kind: "final"; newLevelBand: LevelBand; newLevel: number }
  | { kind: "none" };

export type FriendlyGameCtaInput = {
  cancelled: boolean;
  phase: FriendlyGameCtaPhase | null;
  canScoreSets: boolean;
  canWaitlist: boolean;
  isWaitlisted: boolean;
  waitlistPlace: number | null;
  canRegister: boolean;
  isSeated: boolean;
  isRegistered: boolean;
  canMintInvite: boolean;
  /** Vacant Positions across every side (`vacantJoinSeats(sides).length`). */
  vacantSeatCount: number;
  /** Viewer-scoped rating impact for this Match's Final phase, or `null`
   * when the viewer has no rating event for it (e.g. an organizer who never
   * played) — mirrors `byId.ts`'s `ratingImpact` shape; only the two fields
   * the bottom bar's copy needs are read here. */
  ratingImpact: { newLevelBand: LevelBand; newLevel: number } | null;
};

export function friendlyGameCanMintInvite(game: {
  isOrganizer: boolean;
  registrationStatus: string;
}) {
  return (
    game.isOrganizer &&
    (game.registrationStatus === "open" || game.registrationStatus === "full")
  );
}

/**
 * Sticky bottom bar family (game-details redesign, TEM-183). Reworked around
 * the page's `phase` prop rather than the old tab-suppression check: the
 * Friendly-chrome page has no tab control any more (TEM-179), so a seated or
 * registered viewer's own status is read straight off `phase` instead of
 * "which tab is open." Own status renders exactly once on the page — on
 * this bar — per the redesign's global copy rule.
 *
 * Precedence mirrors the pre-rework function: a Final result (with a
 * viewer-scoped rating impact) or an actionable Needs-a-score state outrank
 * the waitlist/registration branches, which in turn outrank the seated
 * "Upcoming" status — matching the prior `enter_score`-before-`playing`
 * ordering.
 */
export function friendlyGameCtaFamily(
  game: FriendlyGameCtaInput,
): FriendlyGameCtaFamily {
  if (game.cancelled) {
    return { kind: "browse" };
  }
  if (game.phase === "final") {
    if (game.ratingImpact) {
      return {
        kind: "final",
        newLevelBand: game.ratingImpact.newLevelBand,
        newLevel: game.ratingImpact.newLevel,
      };
    }
    return { kind: "none" };
  }
  if (game.phase === "needs_results" && game.canScoreSets) {
    return { kind: "needs_score" };
  }
  if (game.canWaitlist) {
    return { kind: "join_waitlist" };
  }
  if (game.isWaitlisted) {
    return { kind: "waitlisted", place: game.waitlistPlace ?? 1 };
  }
  if (game.canRegister) {
    return { kind: "join" };
  }
  if ((game.isSeated || game.isRegistered) && !game.isWaitlisted) {
    if (game.phase === "upcoming" || game.phase === "ongoing") {
      return {
        kind: "upcoming",
        vacantSeatCount: game.vacantSeatCount,
        showInvite: game.canMintInvite,
      };
    }
    return { kind: "none" };
  }
  return { kind: "none" };
}

export function friendlyGameWaitlistLine(place: number) {
  return `You're ${friendlyGameWaitlistOrdinal(place)} on the Waitlist`;
}

export function friendlyGameWaitlistOrdinal(place: number) {
  const mod100 = place % 100;
  const mod10 = place % 10;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${place}th`;
  }
  if (mod10 === 1) {
    return `${place}st`;
  }
  if (mod10 === 2) {
    return `${place}nd`;
  }
  if (mod10 === 3) {
    return `${place}rd`;
  }
  return `${place}th`;
}

/**
 * Upcoming bottom bar's subline (TEM-183): "One spot left to fill" /
 * "N spots left to fill", or `null` when the court is already full — the bar
 * then shows only the "You're in" status line with no subtext. Distinct
 * wording from `~/lib/game-occupancy.ts`'s `seatsLeftLabel`/`spotsOpenLabel`
 * ("spots open"/"spots left") by design: those label a Game card's
 * occupancy meta, this is the specific bottom-bar copy the spec calls for.
 */
export function friendlyGameVacantSeatLine(
  vacantSeatCount: number,
): string | null {
  if (vacantSeatCount <= 0) {
    return null;
  }
  if (vacantSeatCount === 1) {
    return "One spot left to fill";
  }
  return `${vacantSeatCount} spots left to fill`;
}

/**
 * Final bottom bar's subline (TEM-183): e.g. "C · 2.9 after this game". The
 * Level band renders through the shipped display remap
 * (`displayLabelFromStoredBand`, PR #96), not the raw stored band, matching
 * every other Level surface (`home-level-block.tsx`, `game-lineup-section.tsx`,
 * `game-rating-impact.ts`'s standing sentence).
 */
export function friendlyGameLevelUpdatedLine(
  newLevelBand: LevelBand,
  newLevel: number,
): string {
  return `${displayLabelFromStoredBand(newLevelBand)} · ${newLevel.toFixed(1)} after this game`;
}

export type FriendlyGameOverflowItem =
  | "edit"
  | "close_registration"
  | "reopen_registration"
  | "invite"
  | "share"
  | "leave"
  | "leave_waitlist"
  | "cancel_game";

export type FriendlyGameOverflowInput = {
  isOrganizer: boolean;
  cancelled: boolean;
  registrationClosed: boolean;
  canMintInvite: boolean;
  isSeated: boolean;
  isRegistered: boolean;
  isWaitlisted: boolean;
  canLeave: boolean;
};

export type FriendlyGameJoinSeat = {
  sideIndex: number;
  position: "left" | "right";
};

export function vacantJoinSeats(
  sides: readonly {
    sideIndex: number;
    left: unknown;
    right: unknown;
  }[],
): FriendlyGameJoinSeat[] {
  const vacant: FriendlyGameJoinSeat[] = [];
  for (const side of sides) {
    if (side.left == null) {
      vacant.push({ sideIndex: side.sideIndex, position: "left" });
    }
    if (side.right == null) {
      vacant.push({ sideIndex: side.sideIndex, position: "right" });
    }
  }
  return vacant;
}

export function friendlyGameOverflowItems(
  game: FriendlyGameOverflowInput,
): FriendlyGameOverflowItem[] {
  const items: FriendlyGameOverflowItem[] = [];

  if (game.isOrganizer && !game.cancelled) {
    items.push("edit");
    items.push(
      game.registrationClosed ? "reopen_registration" : "close_registration",
    );
    if (game.canMintInvite) {
      items.push("invite", "share");
    }
    items.push("cancel_game");
  }

  if (game.isWaitlisted) {
    items.push("leave_waitlist");
  } else if (
    !game.isOrganizer &&
    (game.isSeated || game.isRegistered) &&
    game.canLeave
  ) {
    items.push("leave");
  }

  return items;
}

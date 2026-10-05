import { friendlyGameVacantSeatLabel } from "./friendly-game-players";
import { offersPartnerJoin } from "./friendly-game-partner";
import { formatGameSideLabel } from "./game-side-label";
import {
  gameSummaryPrimaryAction,
  showsFriendlyRoster,
  showsGameCardPartnerFooter,
  type GameSummaryCta,
  type GameSummaryCtaInput,
} from "./game-summary-cta";
import { gameOccupancy } from "./game-occupancy";

export type CardSeatPosition = "left" | "right";

type CardSide = { sideIndex: number; left: unknown; right: unknown };

export function vacantSeats<T extends CardSide>(sides: readonly T[]) {
  const vacant: { sideIndex: number; position: CardSeatPosition }[] = [];
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

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function gameCardSubtitle(
  venueName: string | null | undefined,
  location: string | null | undefined,
  gameName: string | null | undefined,
  courtName?: string | null,
) {
  const parts: string[] = [];
  const name = gameName?.trim();
  if (name) {
    parts.push(name);
  }
  const court = courtName?.trim();
  if (court) {
    parts.push(court);
  }
  const city = location?.trim();
  if (city && city !== venueName) {
    parts.push(city);
  }
  return parts.length > 0 ? parts.join(" — ") : null;
}

export function sideJoinAccessibleName(
  sideIndex: number,
  position: CardSeatPosition,
  partnerName: string | null,
) {
  const teamLabel = formatGameSideLabel("friendly_game", sideIndex);
  const positionLabel = position === "left" ? "Left" : "Right";
  const base = friendlyGameVacantSeatLabel("join", teamLabel, positionLabel);
  if (base == null) {
    return "Join";
  }
  return partnerName ? `${base} with ${partnerName}` : base;
}

export function gameCardOpenSpots(game: {
  sides?: readonly CardSide[];
  registeredUserCount?: number;
  playersAllowed?: number | null;
}) {
  const showRoster = Boolean(game.sides && game.sides.length > 0);
  const occupancy = gameOccupancy(
    game.registeredUserCount ?? 0,
    game.playersAllowed,
  );
  return {
    showRoster,
    hasOpenCount: showRoster || occupancy != null,
    openSpots: showRoster
      ? vacantSeats(game.sides ?? []).length
      : (occupancy?.seatsLeft ?? 0),
  };
}

export type GameCardMetaCell = { value: string; note: string | null };

/** The format cell leads with the round or format and falls back to duration, then Level. */
export function gameCardFormatCell(meta: {
  formatMeta: string | null;
  durationMeta: string | null;
  levelMeta: string | null;
}): GameCardMetaCell | null {
  const { formatMeta, durationMeta, levelMeta } = meta;
  if (formatMeta == null && durationMeta == null && levelMeta == null) {
    return null;
  }
  return {
    value: formatMeta ?? durationMeta ?? levelMeta ?? "",
    note: formatMeta
      ? (durationMeta ?? levelMeta)
      : durationMeta
        ? levelMeta
        : null,
  };
}

type HubCardGame = GameSummaryCtaInput & {
  sides: readonly CardSide[];
  matchId: string | null;
};

/** What a My Games card offers: the primary action, the roster it shows and whether it offers Join with a partner. */
export function hubGameCardPlan<T extends HubCardGame>(
  game: T,
): {
  primaryAction: GameSummaryCta;
  rosterSides: T["sides"] | undefined;
  showPartnerJoin: boolean;
} {
  const primaryAction = gameSummaryPrimaryAction(game);
  const rosterSides =
    showsFriendlyRoster(game.format, game.registrationMode) || game.matchId
      ? game.sides
      : undefined;
  const showPartnerJoin =
    showsGameCardPartnerFooter(primaryAction, rosterSides) &&
    offersPartnerJoin({
      canRegister: game.canRegister,
      format: game.format,
      registrationMode: game.registrationMode,
      sides: game.sides,
    });
  return { primaryAction, rosterSides, showPartnerJoin };
}

export type HubWaitlistJoinCall = "register" | "registerSeat";

/** Americano waitlists through `register`; every other format takes a seat door. */
export function hubWaitlistJoinCall(format: string): HubWaitlistJoinCall {
  return format === "americano" ? "register" : "registerSeat";
}

export function hubRegisterToast(waitlisted: boolean) {
  return waitlisted ? "Joined waitlist" : "Registered";
}

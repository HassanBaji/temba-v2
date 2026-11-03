import { levelLabel, shortName } from "./football-board";
import type { FriendlyGameDetailsSeat } from "./friendly-game-details";
import {
  friendlyGameViewerPerspective,
  heroDurationFigure,
  type FriendlyGameHeroMatch,
} from "./friendly-game-hero";
import { formatMatchSlotLabel } from "./game-side-label";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import type { PlayedRow } from "./played-game";
import { formatPricePerPlayerFils } from "./price-per-player";

type Position = "left" | "right";

export const COURT_JOIN_SUBLINE = "Pick your side next";
export const COURT_ADD_PLAYER_HINT = "Tap an open spot to add a player there.";
export const COURT_OPEN_LABEL = "Open";

export function courtSpotsLabel(vacantSeatCount: number) {
  if (vacantSeatCount <= 0) {
    return "Court full";
  }
  return vacantSeatCount === 1
    ? "1 spot open"
    : `${vacantSeatCount} spots open`;
}

export function courtPositionLabel(position: Position) {
  return position === "left" ? "Left" : "Right";
}

export function courtSeatSubline(
  position: Position,
  levelBand: LevelBand | null,
) {
  const label = courtPositionLabel(position);
  return levelBand
    ? `${label} · ${displayLabelFromStoredBand(levelBand)}`
    : label;
}

/** A seat as the player sheet reads it, the same shape a played Game uses. */
export function courtSeatRow(
  seat: FriendlyGameDetailsSeat,
  position: Position,
  viewerUserId: string,
): PlayedRow {
  const isYou = seat.userId === viewerUserId;
  return {
    userId: seat.userId,
    name: isYou ? "You" : shortName(seat.name),
    fullName: seat.name,
    image: seat.image,
    isYou,
    meta: position.toUpperCase(),
    level: levelLabel(seat.levelBand),
    trailing: null,
    unclaimed: Boolean(seat.unclaimed),
    phoneMasked: seat.phoneMasked ?? null,
  };
}

/** "Hassan B (You)" on the court, where every seat is a short name. */
export function courtSeatName(row: PlayedRow) {
  return row.isYou ? `${shortName(row.fullName)} (You)` : row.name;
}

export type CourtFigure = {
  key: string;
  value: string;
  label: string;
  /** Nothing set yet: the figure reads as a placeholder. */
  unset: boolean;
};

export function courtFigures(input: {
  seatedCount: number;
  seatCount: number;
  durationInMinutes: number | null;
  pricePerPlayerFils: number | null;
}): CourtFigure[] {
  const price = formatPricePerPlayerFils(input.pricePerPlayerFils);
  return [
    {
      key: "players",
      value: `${input.seatedCount}/${input.seatCount}`,
      label: "Players",
      unset: false,
    },
    {
      key: "duration",
      value: heroDurationFigure(input.durationInMinutes),
      label: "Duration",
      unset: input.durationInMinutes == null,
    },
    {
      key: "price",
      value: price ?? "—",
      label: price ? "Per player" : "Price not set",
      unset: price == null,
    },
  ];
}

export function scoreLockedLine(courtFull: boolean) {
  return courtFull
    ? "Enter the result after the game."
    : "Opens when the court is full. Enter the result after the game.";
}

/** "Hassan & Ali": first names, so a pair fits beside the Set boxes. */
export function scoreTeamFirstNames(side: {
  left: { name: string } | null;
  right: { name: string } | null;
}) {
  const first = (seat: { name: string } | null) =>
    seat ? (seat.name.trim().split(/\s+/)[0] ?? seat.name) : COURT_OPEN_LABEL;
  return `${first(side.left)} & ${first(side.right)}`;
}

export function scoreSetsMeta(setCount: number) {
  if (setCount === 1) {
    return "1 set";
  }
  return setCount % 2 === 1 ? `Best of ${setCount} sets` : `${setCount} sets`;
}

/** "Set 3 only if it's 1–1." for a best of three; nothing otherwise. */
export function scoreDeciderNote(setCount: number) {
  if (setCount < 3 || setCount % 2 === 0) {
    return null;
  }
  const half = (setCount - 1) / 2;
  return `Set ${setCount} only if it's ${half}–${half}.`;
}

/**
 * Where the Sets stand while the score is still being entered, from the
 * viewer's side when they played and from Team A's otherwise.
 */
export function scoreLeadLine(
  match: FriendlyGameHeroMatch,
  viewerGameTeamId: string | null,
) {
  const played =
    viewerGameTeamId != null &&
    (match.slot1GameTeamId === viewerGameTeamId ||
      match.slot2GameTeamId === viewerGameTeamId);
  const { viewerSetWins, opponentSetWins, sets } =
    friendlyGameViewerPerspective(match, played ? viewerGameTeamId : null);
  if (sets.length === 0) {
    return null;
  }
  const tally = `${viewerSetWins}–${opponentSetWins}`;
  if (viewerSetWins === opponentSetWins) {
    return `Level at ${tally}`;
  }
  const team = played ? "Your team" : formatMatchSlotLabel("friendly_game", 1);
  return viewerSetWins > opponentSetWins
    ? `${team} leads ${tally}`
    : `${team} trails ${tally}`;
}

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { levelLabel, shortName } from "./football-board";
import type { FriendlyGameDetailsSeat } from "./friendly-game-details";
import {
  friendlyGameViewerPerspective,
  heroDurationFigure,
  type FriendlyGameHeroMatch,
} from "./friendly-game-hero";
import {
  FRIENDLY_SET_GAMES_MAX,
  FRIENDLY_SET_GAMES_MIN,
} from "./friendly-game-results";
import { formatMatchSlotLabel } from "./game-side-label";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import type { PlayedRow } from "./played-game";
import { formatPricePerPlayerFils } from "./price-per-player";

type Position = "left" | "right";

export function courtSpotsLabel(vacantSeatCount: number, locale: Locale) {
  const m = messagesFor(locale).game.court;
  if (vacantSeatCount <= 0) {
    return m.full;
  }
  return m.spotsOpen(vacantSeatCount);
}

export function courtPositionLabel(position: Position, locale: Locale) {
  const m = messagesFor(locale).game.court;
  return position === "left" ? m.left : m.right;
}

/** `either` is a User who joined Either side and has not been given a Position. */
export function courtSeatSubline(
  position: Position | "either",
  levelBand: LevelBand | null,
  locale: Locale,
) {
  const label =
    position === "either"
      ? messagesFor(locale).game.joinSheet.eitherSide
      : courtPositionLabel(position, locale);
  return levelBand
    ? messagesFor(locale).game.court.seatMeta(
        label,
        displayLabelFromStoredBand(levelBand),
      )
    : label;
}

/** A seat as the player sheet reads it, the same shape a played Game uses. */
export function courtSeatRow(
  seat: FriendlyGameDetailsSeat,
  position: Position,
  viewerUserId: string,
  locale: Locale,
): PlayedRow {
  const isYou = seat.userId === viewerUserId;
  return {
    userId: seat.userId,
    name: isYou
      ? messagesFor(locale).common.you
      : (seat.nickname?.name ?? shortName(seat.name)),
    isNickname: !isYou && seat.nickname != null,
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
export function courtSeatName(row: PlayedRow, locale: Locale) {
  return row.isYou
    ? messagesFor(locale).game.court.seatNameYou(shortName(row.fullName))
    : row.name;
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
  locale: Locale;
}): CourtFigure[] {
  const m = messagesFor(input.locale).game.court;
  const price = formatPricePerPlayerFils(
    input.pricePerPlayerFils,
    input.locale,
  );
  return [
    {
      key: "players",
      value: `${input.seatedCount}/${input.seatCount}`,
      label: m.figurePlayers,
      unset: false,
    },
    {
      key: "duration",
      value: heroDurationFigure(input.durationInMinutes, input.locale),
      label: m.figureDuration,
      unset: input.durationInMinutes == null,
    },
    {
      key: "price",
      value: price ?? m.figurePriceNotSet,
      label: price ? m.figurePerPlayer : m.figurePrice,
      unset: price == null,
    },
  ];
}

export function scoreLockedLine(courtFull: boolean, locale: Locale) {
  const m = messagesFor(locale).game.court;
  return courtFull ? m.scoreLockedFull : m.scoreLockedOpen;
}

/** "Hassan & Ali": first names, so a pair fits beside the Set boxes. */
export function scoreTeamFirstNames(
  side: {
    left: { name: string } | null;
    right: { name: string } | null;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).game.court;
  const first = (seat: { name: string } | null) =>
    seat ? (seat.name.trim().split(/\s+/)[0] ?? seat.name) : m.open;
  return m.pair(first(side.left), first(side.right));
}

export function scoreSetsMeta(setCount: number, locale: Locale) {
  const m = messagesFor(locale).game.court;
  return setCount > 1 && setCount % 2 === 1
    ? m.bestOfSets(setCount)
    : m.sets(setCount);
}

/** "Set 3 only if it's 1–1." for a best of three; nothing otherwise. */
export function scoreDeciderNote(setCount: number, locale: Locale) {
  if (setCount < 3 || setCount % 2 === 0) {
    return null;
  }
  const half = (setCount - 1) / 2;
  return messagesFor(locale).game.court.decider(setCount, `${half}–${half}`);
}

/** Shown beside a score box whose entry was out of range and was capped. */
export function scoreGamesRangeNote(locale: Locale) {
  return messagesFor(locale).game.court.gamesRange(
    FRIENDLY_SET_GAMES_MIN,
    FRIENDLY_SET_GAMES_MAX,
  );
}

/**
 * Where the Sets stand while the score is still being entered, from the
 * viewer's side when they played and from Team A's otherwise.
 */
export function scoreLeadLine(
  match: FriendlyGameHeroMatch,
  viewerGameTeamId: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).game.court;
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
    return m.levelAt(tally);
  }
  const team = played
    ? m.yourTeam
    : formatMatchSlotLabel("friendly_game", 1, locale);
  return viewerSetWins > opponentSetWins
    ? m.leads(team, tally)
    : m.trails(team, tally);
}

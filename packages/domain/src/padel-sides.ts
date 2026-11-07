import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatGameSideLabel } from "./game-side-label";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";

/**
 * Sides on a padel Friendly game: a Game team has two seats, and a side is a
 * label on a seat. A User picks Left, Right or Either. Either next to a User
 * who picked takes the other side ("auto"); Either next to Either stays open
 * ("no sides picked"). An Organizer may set a full Game team's sides.
 */

export type SideChoice = "left" | "right" | "either";
export type CourtSide = "left" | "right";

export type SidesOccupant = {
  userId: string;
  name: string;
  levelBand?: LevelBand | null;
  eitherSide?: boolean;
  sideSetByUserId?: string | null;
};

export type SidesTeam<T extends SidesOccupant = SidesOccupant> = {
  sideIndex: number;
  left: T | null;
  right: T | null;
};

export type SeatSideState = "picked" | "auto" | "either" | "organizer";

export function otherSide(side: CourtSide): CourtSide {
  return side === "left" ? "right" : "left";
}

function sideWord(side: CourtSide, locale: Locale) {
  const m = messagesFor(locale).game.sides;
  return side === "left" ? m.left : m.right;
}

function partnerOf<T extends SidesOccupant>(
  team: SidesTeam<T>,
  position: CourtSide,
): T | null {
  return team[otherSide(position)];
}

export function seatSideState(
  team: SidesTeam,
  position: CourtSide,
): SeatSideState | null {
  const occupant = team[position];
  if (!occupant) {
    return null;
  }
  if (occupant.sideSetByUserId) {
    return "organizer";
  }
  if (!occupant.eitherSide) {
    return "picked";
  }
  const partner = partnerOf(team, position);
  return partner && !partner.eitherSide ? "auto" : "either";
}

/** A full Game team where neither User picked a side and no Organizer set one. */
export function teamHasNoSidesPicked(team: SidesTeam): boolean {
  return (
    seatSideState(team, "left") === "either" &&
    seatSideState(team, "right") === "either"
  );
}

/** The line under a taken seat in the Line-up: "Right, C", "Right, auto", "Either". */
export function seatSideLabel(
  team: SidesTeam,
  position: CourtSide,
  viewerUserId: string | null,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).game.sides;
  const occupant = team[position];
  const state = seatSideState(team, position);
  if (!occupant || !state) {
    return null;
  }
  const word = sideWord(position, locale);
  if (state === "organizer") {
    return occupant.sideSetByUserId === viewerUserId
      ? m.setByYou(word)
      : m.setByOrganizer(word);
  }
  if (state === "picked") {
    return m.picked(
      word,
      occupant.levelBand
        ? displayLabelFromStoredBand(occupant.levelBand)
        : null,
    );
  }
  // The viewer's own Either reads as their answer; the Line-up note says where they play.
  if (occupant.userId === viewerUserId) {
    return m.eitherSideLabel;
  }
  return state === "auto" ? m.auto(word) : m.either;
}

/** The line under an open seat: the free side when the partner picked one. */
export function openSeatSideLabel(
  team: SidesTeam,
  position: CourtSide,
  locale: Locale,
): string {
  const m = messagesFor(locale).game.sides;
  const partner = partnerOf(team, position);
  if (partner && !partner.eitherSide) {
    return m.openSideOrEither(sideWord(position, locale));
  }
  return m.openAnySide;
}

export function teamVacancy(team: SidesTeam): number {
  return (team.left ? 0 : 1) + (team.right ? 0 : 1);
}

export function teamOccupants<T extends SidesOccupant>(
  team: SidesTeam<T>,
): T[] {
  return [team.left, team.right].filter((row): row is T => row != null);
}

/** The side a picked partner holds, which a joiner cannot take. */
export function takenSide(team: SidesTeam): CourtSide | null {
  const occupant = teamOccupants(team)[0];
  if (teamVacancy(team) !== 1 || !occupant || occupant.eitherSide) {
    return null;
  }
  return team.left === occupant ? "left" : "right";
}

export type JoinTeamOption = {
  sideIndex: number;
  name: string;
  meta: string;
  open: boolean;
};

export function joinTeamOptions(
  teams: readonly SidesTeam[],
  locale: Locale,
): JoinTeamOption[] {
  const m = messagesFor(locale).game.sides;
  return teams.map((team) => {
    const open = teamVacancy(team);
    const partner = teamOccupants(team)[0];
    let meta = m.teamFull;
    if (open === 2) {
      meta = m.teamEmpty(2);
    } else if (open === 1 && partner) {
      const side = takenSide(team);
      meta = m.teamWith(
        partner.name,
        side ? sideWord(side, locale) : m.either,
        1,
      );
    }
    return {
      sideIndex: team.sideIndex,
      name: formatGameSideLabel("friendly_game", team.sideIndex, locale),
      meta,
      open: open > 0,
    };
  });
}

export type JoinSideOption = {
  side: SideChoice;
  label: string;
  /** The partner who picked this side, when it cannot be taken. */
  takenBy: string | null;
};

export function joinSideOptions(
  team: SidesTeam | null,
  locale: Locale,
): JoinSideOption[] {
  const m = messagesFor(locale).game.sides;
  const taken = team ? takenSide(team) : null;
  const partner = team ? (teamOccupants(team)[0] ?? null) : null;
  return (["left", "right", "either"] as const).map((side) => ({
    side,
    label: side === "either" ? m.either : sideWord(side, locale),
    takenBy: side === taken ? (partner?.name ?? null) : null,
  }));
}

/** First Game team with an open seat, preferring one with a partner on it. */
export function defaultJoinTeam(teams: readonly SidesTeam[]): number | null {
  const half = teams.find((team) => teamVacancy(team) === 1);
  const empty = teams.find((team) => teamVacancy(team) === 2);
  return (half ?? empty)?.sideIndex ?? null;
}

/** Preferred Position when the team allows it, otherwise Either. */
export function defaultJoinSide(
  team: SidesTeam | null,
  preferredPosition: string | null | undefined,
): SideChoice {
  if (preferredPosition !== "left" && preferredPosition !== "right") {
    return "either";
  }
  return team && takenSide(team) === preferredPosition
    ? "either"
    : preferredPosition;
}

/** A side the joiner cannot pick on this team falls back to Either. */
export function joinSideFor(
  team: SidesTeam | null,
  side: SideChoice,
): SideChoice {
  return team && side !== "either" && takenSide(team) === side
    ? "either"
    : side;
}

export function sidePickerHint(
  preferredPosition: string | null | undefined,
  locale: Locale,
): string {
  const m = messagesFor(locale).game.sides;
  return preferredPosition === "left" || preferredPosition === "right"
    ? m.sideOptionalUsual(sideWord(preferredPosition, locale))
    : m.sideOptional;
}

/** What happens to the side, in a sentence under the side picker. */
export function joinSideHelp(
  team: SidesTeam | null,
  side: SideChoice,
  locale: Locale,
): string {
  const m = messagesFor(locale).game.sides;
  const partner = team ? (teamOccupants(team)[0] ?? null) : null;
  const taken = team ? takenSide(team) : null;
  if (side === "left") {
    return partner ? m.helpLeftWithPartner(partner.name) : m.helpLeftEmpty;
  }
  if (side === "right") {
    return partner ? m.helpRightWithPartner(partner.name) : m.helpRightEmpty;
  }
  if (partner && taken) {
    return m.helpEitherNextToPicked(
      partner.name,
      sideWord(taken, locale),
      sideWord(otherSide(taken), locale),
    );
  }
  return m.helpEither;
}

function teamName(sideIndex: number, locale: Locale) {
  return formatGameSideLabel("friendly_game", sideIndex, locale);
}

export function joinSeatSummary(
  sideIndex: number,
  side: SideChoice,
  locale: Locale,
): string {
  const m = messagesFor(locale).game.sides;
  return m.seatSummary(
    teamName(sideIndex, locale),
    side === "either" ? m.eitherSide : sideWord(side, locale),
  );
}

export function joinTeamCta(
  sideIndex: number,
  side: SideChoice,
  locale: Locale,
): string {
  const m = messagesFor(locale).game.sides;
  const name = teamName(sideIndex, locale);
  return side === "either"
    ? m.joinTeam(name)
    : m.joinTeamSide(name, sideWord(side, locale));
}

export function viewerTeam<T extends SidesOccupant>(
  teams: readonly SidesTeam<T>[],
  viewerUserId: string | null,
): { team: SidesTeam<T>; position: CourtSide } | null {
  if (!viewerUserId) {
    return null;
  }
  for (const team of teams) {
    if (team.left?.userId === viewerUserId) {
      return { team, position: "left" };
    }
    if (team.right?.userId === viewerUserId) {
      return { team, position: "right" };
    }
  }
  return null;
}

/** The viewer's current answer, for opening the Pick a side sheet. */
export function viewerSideChoice(
  teams: readonly SidesTeam[],
  viewerUserId: string | null,
): SideChoice | null {
  const seat = viewerTeam(teams, viewerUserId);
  if (!seat) {
    return null;
  }
  return seat.team[seat.position]?.eitherSide ? "either" : seat.position;
}

/** The note under the Line-up, or null when there is nothing to explain. */
export function lineupSidesNote(input: {
  teams: readonly SidesTeam[];
  viewerUserId: string | null;
  canJoin: boolean;
  locale: Locale;
}): string | null {
  const m = messagesFor(input.locale).game.sides;
  if (input.canJoin) {
    return m.lineupJoinNote;
  }
  const seat = viewerTeam(input.teams, input.viewerUserId);
  const state = seat ? seatSideState(seat.team, seat.position) : null;
  if (seat && (state === "auto" || state === "either")) {
    const partner = partnerOf(seat.team, seat.position);
    if (!partner) {
      return m.viewerAloneEitherNote;
    }
    return state === "auto"
      ? m.viewerAutoNote(
          partner.name,
          sideWord(otherSide(seat.position), input.locale),
          sideWord(seat.position, input.locale),
        )
      : m.viewerBothEitherNote;
  }
  const full = input.teams.every((team) => teamVacancy(team) === 0);
  return full ? m.lineupFullNote : null;
}

/** The seated bar's subline while the viewer answered Either. */
export function viewerSideOpenLine(
  teams: readonly SidesTeam[],
  viewerUserId: string | null,
  locale: Locale,
): string | null {
  const seat = viewerTeam(teams, viewerUserId);
  const state = seat ? seatSideState(seat.team, seat.position) : null;
  if (!seat || (state !== "either" && state !== "auto")) {
    return null;
  }
  const partner = partnerOf(seat.team, seat.position);
  return partner
    ? messagesFor(locale).game.sides.sideOpenUntil(partner.name)
    : null;
}

export function viewerTeamName(
  teams: readonly SidesTeam[],
  viewerUserId: string | null,
  locale: Locale,
): string | null {
  const seat = viewerTeam(teams, viewerUserId);
  return seat ? teamName(seat.team.sideIndex, locale) : null;
}

/** An Organizer's Set sides prompt shows on a full team nobody picked sides on. */
export function offersSetSides(team: SidesTeam, isOrganizer: boolean): boolean {
  return isOrganizer && teamHasNoSidesPicked(team);
}

/** After an Organizer set sides they may swap them. */
export function offersSwapSides(
  team: SidesTeam,
  viewerUserId: string | null,
): boolean {
  return (
    viewerUserId != null &&
    team.left?.sideSetByUserId === viewerUserId &&
    team.right?.sideSetByUserId === viewerUserId
  );
}

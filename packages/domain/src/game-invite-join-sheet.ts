import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { shortName } from "./football-board";
import {
  footballPositionCode,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import { formatGameSideLabel } from "./game-side-label";
import { groupDisplayName } from "./group-join";
import type {
  GameInviteGroup,
  GameInviteGroupGate,
  InviteSide,
} from "./invites";

export type SeatSideChoice = "left" | "right" | "either";

export type InviteSeatPick = { sideIndex: number; position: SeatSideChoice };

/** One open or taken seat on the link's court (design 3a). */
export type InviteSeatTile = {
  sideIndex: number;
  position: "left" | "right";
  occupant: { name: string } | null;
  /** `Left, or either`, `Team B, any side`, or the occupant's side. */
  sub: string;
};

export type InviteSeatCourt = {
  sideIndex: number;
  label: string;
  seats: InviteSeatTile[];
};

/** The court a padel link shows: a tile per seat, the open ones tappable. */
export function gameInviteSeatCourt(
  sides: readonly InviteSide[],
  locale: Locale,
): InviteSeatCourt[] {
  const m = messagesFor(locale);
  const hero = m.mobileInvite.link.hero;
  return sides.map((side) => {
    const label = formatGameSideLabel("friendly_game", side.sideIndex, locale);
    const seats = (["left", "right"] as const).map((position) => {
      const occupant = side[position];
      const other = side[position === "left" ? "right" : "left"];
      const positionLabel =
        position === "left" ? m.game.court.left : m.game.court.right;
      return {
        sideIndex: side.sideIndex,
        position,
        occupant: occupant ? { name: occupant.name } : null,
        sub: occupant
          ? positionLabel
          : other
            ? hero.openSeat.leftOrEither(positionLabel)
            : hero.openSeat.anySide(label),
      };
    });
    return { sideIndex: side.sideIndex, label, seats };
  });
}

export type InviteJoinSheetTeam = {
  sideIndex: number;
  label: string;
  meta: string;
  full: boolean;
};

export type InviteJoinSheetInput = {
  kind: "padel" | "football";
  sides: readonly InviteSide[];
  picked: InviteSeatPick | null;
  usualSide: "left" | "right" | null;
  /** Football: when the teams are made, if the Organizer set it. */
  teamsMadeAt: string | null;
  group: GameInviteGroup | null;
  gate: GameInviteGroupGate;
  /** A public Game seats a non-member as a guest, so the Group is a choice. */
  gamePublic: boolean;
  /** The viewer is outside the Level range: the seat is asked for, not taken. */
  levelBlocked: boolean;
  locale: Locale;
};

function seatsLeft(side: InviteSide) {
  return [side.left, side.right].filter((seat) => seat == null).length;
}

/** Which of the join, hold and Level request doors the sheet's one button opens. */
export type InviteJoinDoor = "accept" | "hold" | "level_request";

export function inviteJoinDoor(args: {
  gate: GameInviteGroupGate;
  joinGroup: boolean;
  levelBlocked: boolean;
}): InviteJoinDoor {
  if (args.gate === "approval" && args.joinGroup) {
    return "hold";
  }
  if (args.levelBlocked) {
    return "level_request";
  }
  return "accept";
}

/** Everything the one join sheet shows (design 3d, 3f): team, side, the Group toggle, the button. */
export function gameInviteJoinSheetCopy(input: InviteJoinSheetInput) {
  const { locale } = input;
  const m = messagesFor(locale);
  const copy = m.mobileInvite.link.joinSheet;
  const teams: InviteJoinSheetTeam[] = input.sides.map((side) => {
    const label = formatGameSideLabel("friendly_game", side.sideIndex, locale);
    const names = [side.left, side.right]
      .flatMap((seat) => (seat ? [shortName(seat.name)] : []))
      .join(m.group.metaSeparator);
    const left = seatsLeft(side);
    return {
      sideIndex: side.sideIndex,
      label,
      meta:
        left === 0
          ? copy.teamFull
          : names
            ? copy.teamWith(names, copy.seats(left))
            : copy.teamEmpty(copy.seats(left)),
      full: left === 0,
    };
  });
  const pickedTeam = input.picked
    ? teams.find((team) => team.sideIndex === input.picked?.sideIndex)
    : undefined;
  const sideLabel = (side: SeatSideChoice) =>
    side === "either"
      ? copy.either
      : side === "left"
        ? m.game.court.left
        : m.game.court.right;
  const lead =
    input.kind === "football"
      ? input.teamsMadeAt
        ? copy.leadFootball(input.teamsMadeAt)
        : copy.leadFootballNoTeams
      : pickedTeam && input.picked
        ? copy.leadPadelFrom(
            copy.seatLabel(pickedTeam.label, sideLabel(input.picked.position)),
          )
        : copy.leadPadel;
  const groupName = input.group
    ? groupDisplayName(input.group.name, locale)
    : null;
  const groupToggle =
    input.group && groupName && input.gate !== "none"
      ? {
          label: copy.alsoJoin(groupName),
          policy:
            input.gate === "approval"
              ? copy.approvalPolicy
              : copy.openPolicy(
                  m.mobileInvite.link.group.members(input.group.memberCount),
                ),
          /** On a private Game the seat comes with the Group; the switch is fixed on. */
          locked: !input.gamePublic,
          note: input.gamePublic
            ? copy.offNote
            : copy.membersOnlyNote(groupName),
        }
      : null;
  return {
    title: copy.title,
    lead,
    teamLabel: copy.team,
    teams,
    sideLabel: copy.side,
    sideHint: input.usualSide
      ? copy.sideUsual(sideLabel(input.usualSide))
      : copy.sideOptional,
    sideOptions: (["left", "right", "either"] as const).map((side) => ({
      value: side,
      label: sideLabel(side),
    })),
    sideNote: (team: InviteJoinSheetTeam, side: SeatSideChoice) =>
      side === "either"
        ? null
        : copy.sideHint(
            team.label,
            sideLabel(side === "left" ? "right" : "left"),
          ),
    groupToggle,
    levelNote: input.levelBlocked ? copy.levelNote : null,
    cta: (args: {
      joinGroup: boolean;
      seat: InviteSeatPick | null;
      football: { role: FootballRole; position: FootballPosition } | null;
    }) => {
      const door = inviteJoinDoor({
        gate: input.gate,
        joinGroup: args.joinGroup,
        levelBlocked: input.levelBlocked,
      });
      const seat = args.football
        ? args.football.role === "keeper"
          ? m.group.addPlayer.footballRole.keeper.name
          : footballPositionCode(args.football.position, locale)
        : args.seat
          ? copy.seatLabel(
              formatGameSideLabel("friendly_game", args.seat.sideIndex, locale),
              sideLabel(args.seat.position),
            )
          : null;
      if (door === "accept") {
        return seat ? copy.ctaSit(seat) : copy.ctaSitPlain;
      }
      return seat ? copy.ctaRequest(seat) : copy.ctaRequestPlain;
    },
  };
}

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  FOOTBALL_POSITIONS,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import {
  footballSelfPlacementChoices,
  type FootballSelfPlacement,
} from "./football-self-placement";
import {
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "./friendly-game-cta";
import { formatGameSideLabel } from "./game-side-label";
import {
  padelLevelChoices,
  PADEL_NOT_SURE_LEVEL,
  type PadelLevelChoice,
} from "./onboarding-answers";
import { assembleE164 } from "./phone-number";

export type AddPlayerLevel = PadelLevelChoice | "not_sure";

export const ADD_PLAYER_DEFAULT_LEVEL: AddPlayerLevel = "not_sure";

export function addPlayerLevelChoices(locale: Locale): {
  value: AddPlayerLevel;
  mark: string;
  name: string;
  detail: string;
}[] {
  const m = messagesFor(locale).group.addPlayer.notSure;
  return [
    {
      value: "not_sure",
      mark: "?",
      name: m.name,
      detail: m.detail(PADEL_NOT_SURE_LEVEL),
    },
    ...padelLevelChoices(locale).map((choice) => ({
      ...choice,
      mark: choice.value,
    })),
  ];
}

export const ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL: FootballSelfPlacement =
  "beginner";

export function addPlayerFootballLevelChoices(locale: Locale): {
  value: FootballSelfPlacement;
  name: string;
  detail: string;
}[] {
  return footballSelfPlacementChoices(locale).map((choice) => ({
    value: choice.value,
    name: choice.label,
    detail: choice.description,
  }));
}

/** How the Add player sheet places someone, by Game format. */
export type AddPlayerPlacement = "seat" | "side" | "roster" | "football";

export function addPlayerPlacement(game: {
  format: string;
  sport: string | null;
  registrationMode: string;
}): AddPlayerPlacement | null {
  if (game.registrationMode !== "individual") {
    return null;
  }
  if (game.format === "americano") {
    return "roster";
  }
  if (game.format === "friendly_tournament") {
    return "side";
  }
  if (game.format === "friendly_game") {
    return game.sport === "football" ? "football" : "seat";
  }
  return null;
}

export type AddPlayerFootballPosition = FootballPosition | "none";

export const ADD_PLAYER_DEFAULT_FOOTBALL_ROLE: FootballRole = "outfield";

export const ADD_PLAYER_DEFAULT_FOOTBALL_POSITION: AddPlayerFootballPosition =
  "none";

export function addPlayerFootballRoleChoices(locale: Locale): {
  value: FootballRole;
  name: string;
}[] {
  const m = messagesFor(locale).group.addPlayer.roles;
  return [
    { value: "outfield", name: m.outfield },
    { value: "keeper", name: m.keeper },
  ];
}

export function addPlayerFootballPositionChoices(locale: Locale): {
  value: AddPlayerFootballPosition;
  name: string;
}[] {
  const m = messagesFor(locale).group.addPlayer.positions;
  return [
    { value: "none", name: m.any },
    ...FOOTBALL_POSITIONS.map((value) => ({ value, name: m[value] })),
  ];
}

/** A keeper has no outfield position; "No preference" stores none. */
export function addPlayerFootballInput(
  role: FootballRole,
  position: AddPlayerFootballPosition,
): { role: FootballRole; position: FootballPosition | null } {
  return {
    role,
    position: role === "keeper" || position === "none" ? null : position,
  };
}

type NamedSeat = { name: string } | null;

/** Fully vacant sides and Half teams, each with who already holds the side. */
export function addPlayerSideChoices(
  sides: readonly { sideIndex: number; left: NamedSeat; right: NamedSeat }[],
  locale: Locale,
): { sideIndex: number; team: string; detail: string }[] {
  const m = messagesFor(locale).group.addPlayer;
  return sides.flatMap((side) => {
    if (side.left && side.right) {
      return [];
    }
    const partner = side.left ?? side.right;
    return [
      {
        sideIndex: side.sideIndex,
        team: formatGameSideLabel(
          "friendly_tournament",
          side.sideIndex,
          locale,
        ),
        detail: partner ? m.sideWith(partner.name) : m.sideOpen,
      },
    ];
  });
}

export type PhonePlayerPreview = {
  kind: "account" | "unclaimed" | "new";
  name: string | null;
  alreadyOnGame: boolean;
  phoneMasked?: string;
};

/** The E.164 number once the national part is complete, so the preview can run. */
export function addPlayerCompletePhone(
  countryIso: string,
  national: string,
): string | null {
  const assembled = assembleE164(countryIso, national);
  return assembled.ok ? assembled.e164 : null;
}

export function addPlayerPreviewLine(
  preview: PhonePlayerPreview,
  locale: Locale,
): string {
  const m = messagesFor(locale).group.addPlayer.preview;
  const name = preview.name ?? m.thisPlayer;
  if (preview.alreadyOnGame) {
    return m.alreadyOnGame(name);
  }
  if (preview.kind === "account") {
    return m.account(name);
  }
  if (preview.kind === "unclaimed") {
    return m.unclaimed(name);
  }
  return m.new;
}

export function addPlayerCanSubmit(input: {
  preview: PhonePlayerPreview | null;
  name: string;
  placed: boolean;
}): boolean {
  if (!input.preview || input.preview.alreadyOnGame || !input.placed) {
    return false;
  }
  return input.preview.kind !== "new" || input.name.trim().length > 0;
}

export function addPlayerAddedToast(name: string, locale: Locale) {
  return messagesFor(locale).group.addPlayer.addedToast(name);
}

export type GroupPhonePlayerPreview = {
  kind: "account" | "unclaimed" | "new";
  name: string | null;
  alreadyInGroup: boolean;
  phoneMasked?: string;
};

export function addGroupPlayerIsFootball(sport: string | null | undefined) {
  return sport === "football";
}

export function addGroupPlayerPreviewLine(
  preview: GroupPhonePlayerPreview,
  locale: Locale,
): string {
  const m = messagesFor(locale).group.addPlayer.preview;
  const name = preview.name ?? m.thisPlayer;
  if (preview.alreadyInGroup) {
    return m.alreadyInGroup(name);
  }
  if (preview.kind === "account") {
    return m.accountInvited(name);
  }
  return addPlayerPreviewLine({ ...preview, alreadyOnGame: false }, locale);
}

export function addGroupPlayerCanSubmit(input: {
  preview: GroupPhonePlayerPreview | null;
  name: string;
}): boolean {
  if (!input.preview || input.preview.alreadyInGroup) {
    return false;
  }
  return addPlayerCanSubmit({
    preview: { ...input.preview, alreadyOnGame: false },
    name: input.name,
    placed: true,
  });
}

export function addGroupPlayerDoneToast(
  result: {
    outcome: "added" | "invited";
    name: string;
  },
  locale: Locale,
) {
  return result.outcome === "invited"
    ? messagesFor(locale).group.addPlayer.inviteSentToast(result.name)
    : addPlayerAddedToast(result.name, locale);
}

export function removePlayerConfirmLine(name: string, locale: Locale) {
  return messagesFor(locale).group.addPlayer.removeConfirm(name);
}

export function removePlayerToast(name: string, locale: Locale) {
  return messagesFor(locale).group.addPlayer.removedToast(name);
}

export const UNCLAIMED_PLAYER_NAME_MAX_LENGTH = 255;

export function renameUnclaimedPlayerCanSubmit(input: {
  current: string;
  next: string;
}) {
  const next = input.next.trim();
  return (
    next.length > 0 &&
    next.length <= UNCLAIMED_PLAYER_NAME_MAX_LENGTH &&
    next !== input.current
  );
}

export function renameUnclaimedPlayerToast(name: string, locale: Locale) {
  return messagesFor(locale).group.addPlayer.renamedToast(name);
}

export function addPlayerSeatChoices(
  sides: readonly { sideIndex: number; left: unknown; right: unknown }[],
  locale: Locale,
): {
  seat: FriendlyGameJoinSeat;
  team: string;
  side: string;
  label: string;
}[] {
  const m = messagesFor(locale).group.addPlayer.seat;
  return vacantJoinSeats(sides).map((seat) => {
    const team = formatGameSideLabel("friendly_game", seat.sideIndex, locale);
    const side = seat.position === "left" ? m.left : m.right;
    return { seat, team, side, label: m.label(team, side) };
  });
}

export function sameJoinSeat(
  left: FriendlyGameJoinSeat | null,
  right: FriendlyGameJoinSeat | null,
) {
  if (!left || !right) {
    return false;
  }
  return left.sideIndex === right.sideIndex && left.position === right.position;
}

/**
 * While there is room: a vacant Position on a padel Friendly game, a side
 * with room on a tournament before its Pool draw, or a roster below players
 * allowed on an Americano or football Game. A played Game stays open to the
 * Organizer, so the record can be put right after the fact.
 */
export function organizerCanAddPlayer(game: {
  isOrganizer: boolean;
  cancelledAt: Date | string | null;
  joinFrozen: boolean;
  phase: string | null;
  format: string;
  sport: string | null;
  registrationMode: string;
  sides: readonly { sideIndex: number; left: unknown; right: unknown }[];
  drawPostedAt?: Date | string | null;
  roster?: { count: number; cap: number | null } | null;
}): boolean {
  if (!game.isOrganizer || game.cancelledAt || game.joinFrozen) {
    return false;
  }
  const placement = addPlayerPlacement(game);
  if (placement === "seat") {
    return game.phase !== "cancelled" && vacantJoinSeats(game.sides).length > 0;
  }
  if (placement === "side") {
    return !game.drawPostedAt && vacantJoinSeats(game.sides).length > 0;
  }
  if (placement === "roster" || placement === "football") {
    const roster = game.roster;
    return roster != null && (roster.cap == null || roster.count < roster.cap);
  }
  return false;
}

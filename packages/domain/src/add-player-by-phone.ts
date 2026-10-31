import {
  FOOTBALL_POSITION_CHOICES,
  type FootballPosition,
  type FootballRole,
} from "./football-lineup";
import {
  FOOTBALL_SELF_PLACEMENT_CHOICES,
  type FootballSelfPlacement,
} from "./football-self-placement";
import {
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "./friendly-game-cta";
import { formatGameSideLabel } from "./game-side-label";
import {
  PADEL_LEVEL_CHOICES,
  PADEL_NOT_SURE_LEVEL,
  type PadelLevelChoice,
} from "./onboarding-answers";
import { assembleE164 } from "./phone-number";

export const ADD_PLAYER_ACTION = "Add player";

export const NOT_ON_TEMBA_YET_LABEL = "Not on Temba yet";

export const ADD_PLAYER_NAME_LABEL = "Their name";

export const ADD_PLAYER_DESCRIPTION =
  "Add someone by phone. They don't need Temba to play.";

export type AddPlayerLevel = PadelLevelChoice | "not_sure";

export const ADD_PLAYER_DEFAULT_LEVEL: AddPlayerLevel = "not_sure";

export const ADD_PLAYER_LEVEL_CHOICES: {
  value: AddPlayerLevel;
  mark: string;
  name: string;
  detail: string;
}[] = [
  {
    value: "not_sure",
    mark: "?",
    name: "Not sure",
    detail: `Starts at ${PADEL_NOT_SURE_LEVEL}.`,
  },
  ...PADEL_LEVEL_CHOICES.map((choice) => ({ ...choice, mark: choice.value })),
];

export const ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL: FootballSelfPlacement =
  "beginner";

export const ADD_PLAYER_FOOTBALL_LEVEL_CHOICES: {
  value: FootballSelfPlacement;
  name: string;
  detail: string;
}[] = FOOTBALL_SELF_PLACEMENT_CHOICES.map((choice) => ({
  value: choice.value,
  name: choice.label,
  detail: choice.description,
}));

export const ADD_PLAYER_NO_SEAT_COPY = "Every Position is taken.";

export const ADD_PLAYER_NO_SIDE_COPY = "Every side is full.";

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

export const ADD_PLAYER_FOOTBALL_ROLE_CHOICES: {
  value: FootballRole;
  name: string;
  detail: string;
}[] = [
  { value: "outfield", name: "Player", detail: "outfield" },
  { value: "keeper", name: "Keeper", detail: "in goal" },
];

export const ADD_PLAYER_FOOTBALL_POSITION_CHOICES: {
  value: AddPlayerFootballPosition;
  name: string;
}[] = [
  { value: "none", name: "No preference" },
  ...FOOTBALL_POSITION_CHOICES.map((choice) => ({
    value: choice.value,
    name: choice.label,
  })),
];

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
): { sideIndex: number; team: string; detail: string }[] {
  return sides.flatMap((side) => {
    if (side.left && side.right) {
      return [];
    }
    const partner = side.left ?? side.right;
    return [
      {
        sideIndex: side.sideIndex,
        team: formatGameSideLabel("friendly_tournament", side.sideIndex),
        detail: partner ? `With ${partner.name}` : "Open",
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

export function addPlayerPreviewLine(preview: PhonePlayerPreview): string {
  const name = preview.name ?? "This player";
  if (preview.alreadyOnGame) {
    return `${name} is already on this Game`;
  }
  if (preview.kind === "account") {
    return `This is ${name} (has an account)`;
  }
  if (preview.kind === "unclaimed") {
    return `Already on Temba as ${name} (no account yet)`;
  }
  return "Not on Temba yet. Add their name and starting Level.";
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

export function addPlayerAddedToast(name: string) {
  return `${name} added`;
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

export const ADD_GROUP_PLAYER_DESCRIPTION =
  "Add someone by phone. If they're on Temba, they get an invite to accept.";

export function addGroupPlayerPreviewLine(
  preview: GroupPhonePlayerPreview,
): string {
  const name = preview.name ?? "This player";
  if (preview.alreadyInGroup) {
    return `${name} is already in this Group`;
  }
  if (preview.kind === "account") {
    return `This is ${name} (has an account). They get an invite to accept.`;
  }
  return addPlayerPreviewLine({ ...preview, alreadyOnGame: false });
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

export function addGroupPlayerDoneToast(result: {
  outcome: "added" | "invited";
  name: string;
}) {
  return result.outcome === "invited"
    ? `Invite sent to ${result.name}`
    : addPlayerAddedToast(result.name);
}

export const REMOVE_PLAYER_ACTION = "Remove from Group";

export function removePlayerConfirmLine(name: string) {
  return `Remove ${name} from this Group? Their Games stay in history.`;
}

export function removePlayerToast(name: string) {
  return `${name} removed`;
}

export const RENAME_UNCLAIMED_PLAYER_ACTION = "Edit name";

export const RENAME_UNCLAIMED_PLAYER_DESCRIPTION =
  "Their phone stays the same. If the number is wrong, remove them and add them again.";

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

export function renameUnclaimedPlayerToast(name: string) {
  return `Name changed to ${name}`;
}

export function addPlayerSeatChoices(
  sides: readonly { sideIndex: number; left: unknown; right: unknown }[],
): {
  seat: FriendlyGameJoinSeat;
  team: string;
  side: string;
  label: string;
}[] {
  return vacantJoinSeats(sides).map((seat) => {
    const team = formatGameSideLabel("friendly_game", seat.sideIndex);
    const side = seat.position === "left" ? "Left" : "Right";
    return { seat, team, side, label: `${team} · ${side}` };
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
 * Until a completed Match, while there is room: a vacant Position on a padel
 * Friendly game, a side with room on a tournament before its Pool draw, or a
 * roster below players allowed on an Americano or football Game.
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
  matches?: readonly { status: string | null }[];
  roster?: { count: number; cap: number | null } | null;
}): boolean {
  if (!game.isOrganizer || game.cancelledAt || game.joinFrozen) {
    return false;
  }
  if (game.matches?.some((match) => match.status === "completed")) {
    return false;
  }
  const placement = addPlayerPlacement(game);
  if (placement === "seat") {
    return (
      game.phase !== "final" &&
      game.phase !== "cancelled" &&
      vacantJoinSeats(game.sides).length > 0
    );
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

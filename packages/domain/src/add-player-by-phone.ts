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

export const ADD_PLAYER_NO_SEAT_COPY = "Every Position is taken.";

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
  seat: FriendlyGameJoinSeat | null;
}): boolean {
  if (!input.preview || input.preview.alreadyOnGame || !input.seat) {
    return false;
  }
  return input.preview.kind !== "new" || input.name.trim().length > 0;
}

export function addPlayerAddedToast(name: string) {
  return `${name} added`;
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

/** Padel Friendly games only, Booking Games among them, until a Match is completed. */
export function organizerCanAddPlayer(game: {
  isOrganizer: boolean;
  cancelledAt: Date | string | null;
  joinFrozen: boolean;
  phase: string | null;
  format: string;
  sport: string | null;
  registrationMode: string;
  sides: readonly { sideIndex: number; left: unknown; right: unknown }[];
}): boolean {
  return (
    game.isOrganizer &&
    !game.cancelledAt &&
    !game.joinFrozen &&
    game.phase !== "final" &&
    game.phase !== "cancelled" &&
    game.format === "friendly_game" &&
    game.sport !== "football" &&
    game.registrationMode === "individual" &&
    vacantJoinSeats(game.sides).length > 0
  );
}

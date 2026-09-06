import type { GameHomeTab } from "~/lib/game-home-tab";

export type FriendlyGameCtaFamily =
  | { kind: "browse" }
  | { kind: "enter_score" }
  | { kind: "join_waitlist" }
  | { kind: "waitlisted"; place: number }
  | { kind: "join" }
  | { kind: "playing"; showInvite: boolean }
  | { kind: "none" };

export type FriendlyGameCtaInput = {
  cancelled: boolean;
  canScoreSets: boolean;
  tab: GameHomeTab;
  canWaitlist: boolean;
  isWaitlisted: boolean;
  waitlistPlace: number | null;
  canRegister: boolean;
  isSeated: boolean;
  isRegistered: boolean;
  canMintInvite: boolean;
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

export function friendlyGameCtaFamily(
  game: FriendlyGameCtaInput,
): FriendlyGameCtaFamily {
  if (game.cancelled) {
    return { kind: "browse" };
  }
  if (game.canScoreSets && game.tab !== "results") {
    return { kind: "enter_score" };
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
    return { kind: "playing", showInvite: game.canMintInvite };
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

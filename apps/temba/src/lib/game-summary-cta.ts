export type GameSummaryCta = "join" | "join_waitlist" | "register" | "view";

export type GameSummaryCtaInput = {
  format: string;
  registrationMode: string;
  canRegister: boolean;
  canWaitlist: boolean;
  joinFrozen: boolean;
  isRegistered: boolean;
  isSeated: boolean;
  isWaitlisted: boolean;
  registrationStatus: string;
};

export function gameSummaryPrimaryAction(
  game: GameSummaryCtaInput,
): GameSummaryCta {
  if (
    game.isRegistered ||
    game.isSeated ||
    game.isWaitlisted ||
    game.joinFrozen ||
    game.registrationStatus === "closed" ||
    game.registrationStatus === "cancelled"
  ) {
    return "view";
  }

  if (game.registrationMode === "team_only") {
    return "view";
  }

  if (game.format === "friendly_tournament") {
    if (game.canWaitlist) {
      return "join_waitlist";
    }
    return "view";
  }

  if (game.format === "americano") {
    if (game.canRegister) {
      return "register";
    }
    if (game.canWaitlist) {
      return "join_waitlist";
    }
    return "view";
  }

  if (game.canRegister) {
    return "join";
  }
  if (game.canWaitlist) {
    return "join_waitlist";
  }
  return "view";
}

export function gameSummaryCtaLabel(action: GameSummaryCta) {
  switch (action) {
    case "join":
      return "Join";
    case "join_waitlist":
      return "Join waitlist";
    case "register":
      return "Register";
    case "view":
      return "View";
  }
}

export type GameViewerStatus = "in" | "waitlisted" | null;

/** Null when the viewer has no standing on the Game, so cards stay quiet. */
export function gameViewerStatus(
  game: Pick<GameSummaryCtaInput, "isRegistered" | "isSeated" | "isWaitlisted">,
): GameViewerStatus {
  if (game.isSeated || game.isRegistered) {
    return "in";
  }
  if (game.isWaitlisted) {
    return "waitlisted";
  }
  return null;
}

export function showsFriendlyRoster(format: string, registrationMode: string) {
  return format === "friendly_game" && registrationMode === "individual";
}

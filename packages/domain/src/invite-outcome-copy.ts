export type InviteOutcomeKind =
  | "invalid"
  | "unavailable"
  | "waiting_for_partner";

export type InviteHostLabel = "Community" | "Group" | "Team" | "Game";

export function inviteOutcomeCopy(
  outcome: InviteOutcomeKind,
  hostLabel: InviteHostLabel,
): { title: string; description: string } {
  if (outcome === "invalid") {
    return {
      title: "Link expired or invalid",
      description: "Ask the person who shared it for a new invite link.",
    };
  }
  if (outcome === "unavailable") {
    const joiners = hostLabel === "Game" ? "players" : "members";
    return {
      title: `Not accepting new ${joiners}`,
      description: `This ${hostLabel} isn't accepting new ${joiners} right now.`,
    };
  }
  return {
    title: "Waiting for your partner",
    description:
      "Your Team is registered once both partners accept. Until then you don't hold a seat or a waitlist spot.",
  };
}

export type InviteOutcomeTarget = "home" | "sign-in";

export function inviteOutcomeAction(isSignedIn: boolean): {
  label: string;
  target: InviteOutcomeTarget;
} {
  return isSignedIn
    ? { label: "Go to Home", target: "home" }
    : { label: "Sign in", target: "sign-in" };
}

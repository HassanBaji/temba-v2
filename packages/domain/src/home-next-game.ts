import { formatHomeCountdown } from "./home-countdown";

export type HomeNextGamePhase = "upcoming" | "ongoing" | "needs_results";

export type HomeGameIntent = "invite" | "results";

export type HomeTarget = {
  kind: "game";
  gameId: string;
  intent?: HomeGameIntent;
};

export function homeNextGameActions({
  gameId,
  phase,
  hasOpenSeat,
}: {
  gameId: string;
  phase: HomeNextGamePhase;
  hasOpenSeat: boolean;
}): {
  primary: { target: HomeTarget; label: string };
  details: HomeTarget | null;
} {
  const game: HomeTarget = { kind: "game", gameId };
  if (phase === "needs_results") {
    return {
      primary: {
        target: { ...game, intent: "results" },
        label: "Add results",
      },
      details: game,
    };
  }
  if (phase === "upcoming" && hasOpenSeat) {
    return {
      primary: {
        target: { ...game, intent: "invite" },
        label: "Invite a player",
      },
      details: game,
    };
  }
  return { primary: { target: game, label: "View game" }, details: null };
}

export function homeNextGameStatus(
  phase: HomeNextGamePhase,
  startsAt: Date,
  now: Date,
): string | null {
  if (phase === "ongoing") {
    return "Playing now";
  }
  if (phase === "needs_results") {
    return "Add results";
  }
  return formatHomeCountdown(startsAt, now);
}

export function homeNextGameSecondaryLine(
  courtLabel: string | null | undefined,
  formatLabel: string,
): string {
  return [courtLabel, formatLabel].filter(Boolean).join(" · ");
}

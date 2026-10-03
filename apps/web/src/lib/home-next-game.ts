import { gameHomeIntentHref } from "~/lib/game-home-tab";

export type HomeNextGamePhase = "upcoming" | "ongoing" | "needs_results";

export function homeNextGameActions({
  gameId,
  phase,
  hasOpenSeat,
}: {
  gameId: string;
  phase: HomeNextGamePhase;
  hasOpenSeat: boolean;
}): {
  primary: { href: string; label: string };
  detailsHref: string | null;
} {
  const gameHref = `/dashboard/games/${gameId}`;
  const primary =
    phase === "needs_results"
      ? { href: gameHomeIntentHref(gameId, "results"), label: "Add results" }
      : phase === "upcoming" && hasOpenSeat
        ? {
            href: gameHomeIntentHref(gameId, "invite"),
            label: "Invite a player",
          }
        : { href: gameHref, label: "View game" };
  return {
    primary,
    detailsHref: primary.href === gameHref ? null : gameHref,
  };
}

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
  locale,
}: {
  gameId: string;
  phase: HomeNextGamePhase;
  hasOpenSeat: boolean;
  locale: Locale;
}): {
  primary: { target: HomeTarget; label: string };
  details: HomeTarget | null;
} {
  const m = messagesFor(locale).home.nextGame;
  const game: HomeTarget = { kind: "game", gameId };
  if (phase === "needs_results") {
    return {
      primary: {
        target: { ...game, intent: "results" },
        label: m.addResults,
      },
      details: game,
    };
  }
  if (phase === "upcoming" && hasOpenSeat) {
    return {
      primary: {
        target: { ...game, intent: "invite" },
        label: m.invitePlayer,
      },
      details: game,
    };
  }
  return { primary: { target: game, label: m.viewGame }, details: null };
}

export function homeNextGameStatus(
  phase: HomeNextGamePhase,
  startsAt: Date,
  now: Date,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).home.nextGame;
  if (phase === "ongoing") {
    return m.playingNow;
  }
  if (phase === "needs_results") {
    return m.addResults;
  }
  return formatHomeCountdown(startsAt, now, locale);
}

export function homeNextGameSecondaryLine(
  courtLabel: string | null | undefined,
  formatLabel: string,
): string {
  return [courtLabel, formatLabel].filter(Boolean).join(" · ");
}

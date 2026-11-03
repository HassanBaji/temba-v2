import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type HomeNoGamesCreateAction =
  | { kind: "group"; target: { kind: "create-group" }; label: string }
  | { kind: "game"; target: { kind: "create-game" }; label: string };

export function homeNoGamesCreateAction(input: {
  createGroupCount: number | undefined;
  locale: Locale;
}): HomeNoGamesCreateAction {
  const m = messagesFor(input.locale).home.noGames;
  if (input.createGroupCount === 0) {
    return {
      kind: "group",
      target: { kind: "create-group" },
      label: m.createGroup,
    };
  }
  return { kind: "game", target: { kind: "create-game" }, label: m.create };
}

export function homeNoGamesCopy(
  createAction: HomeNoGamesCreateAction | null,
  locale: Locale,
): string {
  const m = messagesFor(locale).home.noGames;
  return createAction?.kind === "group" ? m.createGroupFirst : m.browse;
}

import { Share } from "react-native";

import {
  playedGameShareMessage,
  type ResultShareGame,
} from "@repo/domain/game-result-share";

import { useLocale } from "../i18n/locale-provider";
import { useErrorMessage } from "../lib/use-error-message";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

/**
 * The share of a played Game with no score yet: who played and the Game
 * page, through the share sheet.
 */
export function useSharePlayedGame(gameId: string) {
  const toast = useToast();
  const errorText = useErrorMessage();
  const locale = useLocale();
  const utils = api.useUtils();

  return async (game: ResultShareGame) => {
    try {
      const page = await utils.games.resultLink.fetch({ gameId });
      await Share.share({
        message: playedGameShareMessage(game, page.url, locale),
      });
    } catch (error) {
      toast.show(errorText(error));
    }
  };
}

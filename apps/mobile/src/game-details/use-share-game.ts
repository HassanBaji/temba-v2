import { Share } from "react-native";

import type { FriendlyGameShareLink } from "@repo/domain/friendly-game-cta";

import {
  gameShareMessage,
  type GameShareContext,
} from "../invites/invites-model";
import { useLocale } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { useErrorMessage } from "../lib/use-error-message";

/**
 * The hero's share: the Organizer mints the Game's invite link, everyone
 * else shares the Game page, then the share sheet opens.
 */
export function useShareGame(gameId: string) {
  const toast = useToast();
  const errorText = useErrorMessage();
  const locale = useLocale();
  const utils = api.useUtils();
  const createLink = api.games.createInviteLink.useMutation({
    onSuccess: () => void utils.games.getInviteLink.invalidate({ gameId }),
    onError: (error) => toast.show(error.message),
  });

  async function gamePageLink() {
    try {
      const page = await utils.games.resultLink.fetch({ gameId });
      return { shortUrl: null, inviteUrl: page.url };
    } catch (error) {
      toast.show(errorText(error));
      return null;
    }
  }

  return async (context: GameShareContext, kind: FriendlyGameShareLink) => {
    const link =
      kind === "invite_link"
        ? await createLink.mutateAsync({ gameId }).catch(() => null)
        : await gamePageLink();
    if (link) {
      await Share.share({ message: gameShareMessage(context, link, locale) });
    }
  };
}

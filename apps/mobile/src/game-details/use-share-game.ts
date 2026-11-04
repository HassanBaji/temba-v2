import { Share } from "react-native";

import {
  gameShareMessage,
  type GameShareContext,
} from "../invites/invites-model";
import { useLocale } from "../i18n/locale-provider";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

/** The hero's share: mints the Game's invite link and opens the share sheet. */
export function useShareGame(gameId: string) {
  const toast = useToast();
  const locale = useLocale();
  const utils = api.useUtils();
  const createLink = api.games.createInviteLink.useMutation({
    onSuccess: () => void utils.games.getInviteLink.invalidate({ gameId }),
    onError: (error) => toast.show(error.message),
  });

  return async (context: GameShareContext) => {
    const link = await createLink.mutateAsync({ gameId }).catch(() => null);
    if (link) {
      await Share.share({ message: gameShareMessage(context, link, locale) });
    }
  };
}

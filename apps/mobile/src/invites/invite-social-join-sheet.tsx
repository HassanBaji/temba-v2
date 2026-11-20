import type { FriendlyGameJoinSeat } from "@repo/domain/friendly-game-cta";
import {
  isPartnerVacantSideRace,
  offersPartnerJoin,
  partnerVacantSideRaceRecovery,
} from "@repo/domain/friendly-game-partner";
import { gameJoinToast } from "@repo/domain/game-copy";
import { tournamentPartnerVacantSideRaceMessage } from "@repo/domain/tournament-join";
import { isPartnerRequiredGame } from "@repo/domain/tournament-rounds";
import { useEffect, useState } from "react";

import { gameTitle } from "../game-details/details-model";
import { JoinSheet } from "../game-details/join-sheet";
import { useLocale } from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

/**
 * The Game screen's join sheet on a Social's Invite link: alone or with a
 * partner, then a seat. Only for a viewer who may open the Game.
 */
export function InviteSocialJoinSheet({
  gameId,
  visible,
  initialSeat,
  seatPending,
  seatError,
  onClose,
  onJoinSeat,
  onJoined,
}: {
  gameId: string;
  visible: boolean;
  initialSeat: FriendlyGameJoinSeat | null;
  seatPending: boolean;
  seatError: string | null;
  onClose: () => void;
  onJoinSeat: (seat: {
    sideIndex: number;
    position: "left" | "right" | "either";
  }) => void;
  /** The viewer registered with a partner: the link has done its job. */
  onJoined: () => void;
}) {
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const [partnerQuery, setPartnerQuery] = useState("");
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const game = api.games.byId.useQuery({ id: gameId });
  const data = game.data;
  const offersPartner = Boolean(
    data &&
      !data.organizerMakesTeams &&
      offersPartnerJoin({
        canRegister: data.canRegister,
        format: data.format,
        registrationMode: data.registrationMode,
        sides: data.sides,
      }),
  );
  const partnerQueriesOn = visible && offersPartner;
  const onboarding = api.users.onboardingState.useQuery(undefined, {
    enabled: visible,
  });
  const suggestions = api.games.listPartnerSuggestions.useQuery(
    { gameId },
    { enabled: partnerQueriesOn },
  );
  const search = api.games.searchPartnerUsers.useQuery(
    { gameId, query: partnerQuery },
    { enabled: partnerQueriesOn && partnerQuery.trim().length > 0 },
  );

  useEffect(() => {
    if (visible) {
      setPartnerQuery("");
      setPartnerError(null);
    }
  }, [visible]);

  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: async (result) => {
      toast.show(gameJoinToast(result.waitlisted, locale));
      await Promise.all([
        utils.games.byId.invalidate({ id: gameId }),
        utils.games.listMyGames.invalidate(),
        utils.users.home.invalidate(),
      ]);
      onJoined();
    },
    onError: async (error) => {
      if (
        !isPartnerVacantSideRace({
          message: error.message,
          data: { code: error.data?.code },
        })
      ) {
        setPartnerError(error.message);
        return;
      }
      const raceMessage = tournamentPartnerVacantSideRaceMessage(
        data != null && isPartnerRequiredGame(data),
        locale,
      );
      setPartnerError(raceMessage);
      const fresh = await utils.games.byId.fetch({ id: gameId });
      if (partnerVacantSideRaceRecovery(fresh.sides) === "game_home") {
        toast.show(raceMessage);
        onClose();
      }
    },
  });

  if (!data) {
    return null;
  }

  return (
    <JoinSheet
      visible={visible}
      initialSeat={initialSeat}
      onClose={onClose}
      game={{
        title: gameTitle(data, locale),
        sides: data.sides,
        pricePerPlayerFils: data.pricePerPlayerFils,
        windowStart: data.windowStart,
        venueName: data.venue?.name ?? null,
        isOrganizer: data.isOrganizer,
        levelMinTenths: data.levelMinTenths,
        levelMaxTenths: data.levelMaxTenths,
        offersPartner,
        partnerRequired: isPartnerRequiredGame(data),
      }}
      preferredPosition={onboarding.data?.preferredPosition ?? null}
      seatPending={seatPending}
      partnerPending={registerWithPartner.isPending}
      error={partnerError ?? seatError}
      suggestions={slotOf(suggestions)}
      searchResults={slotOf(search)}
      query={partnerQuery}
      onQueryChange={setPartnerQuery}
      onJoinSeat={(seat) => {
        setPartnerError(null);
        onJoinSeat({ sideIndex: seat.sideIndex, position: seat.position });
      }}
      onRegisterWithPartner={({ partner, sideIndex, position }) => {
        setPartnerError(null);
        registerWithPartner.mutate({
          gameId,
          partnerUserId: partner.id,
          sideIndex,
          position,
        });
      }}
    />
  );
}

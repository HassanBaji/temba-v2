"use client";

import { notFound, useRouter } from "next/navigation";
import { use, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";
import {
  FriendlyGamePartnerPicker,
  type FriendlyGamePartnerPick,
} from "~/components/games/friendly-game-partner-picker";
import { FriendlyGamePartnerReview } from "~/components/games/friendly-game-partner-review";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { vacantJoinSeats } from "~/lib/friendly-game-cta";
import {
  firstFullyVacantSideIndex,
  friendlyGameHomeHref,
  isPartnerVacantSideRace,
  offersPartnerJoin,
  PARTNER_JOIN_UNAVAILABLE_TOAST,
  PARTNER_VACANT_SIDE_RACE_MESSAGE,
  partnerVacantSideRaceRecovery,
} from "~/lib/friendly-game-partner";
import { isNotFoundError } from "~/lib/is-not-found-error";
import { api } from "~/trpc/react";

type PartnerPageStep = "pick" | "review";

function PartnerPageShell({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      title="Pick a partner"
      hidePageHeader
      hideMobileTopBar
      hideNav
    >
      {children}
    </DashboardShell>
  );
}

export default function PickAPartnerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = api.useUtils();
  const recovered = useRef(false);
  const [step, setStep] = useState<PartnerPageStep>("pick");
  const [selectedPartner, setSelectedPartner] =
    useState<FriendlyGamePartnerPick | null>(null);
  const [partnerRaceMessage, setPartnerRaceMessage] = useState<string | null>(
    null,
  );

  const game = api.games.byId.useQuery({ id });
  const data = game.data;
  const offerPartner = data
    ? offersPartnerJoin({
        canRegister: data.canRegister,
        format: data.format,
        registrationMode: data.registrationMode,
        sides: data.sides,
      })
    : false;
  const suggestions = api.games.listPartnerSuggestions.useQuery(
    { gameId: id },
    { enabled: offerPartner },
  );
  const onboardingState = api.users.onboardingState.useQuery(undefined, {
    enabled: offerPartner,
  });

  const homeHref = friendlyGameHomeHref(id);

  function goGameHome() {
    router.replace(homeHref);
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    goGameHome();
  }

  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: async (result) => {
      recovered.current = true;
      toast.success(result.waitlisted ? "Joined waitlist" : "Registered");
      await utils.games.byId.invalidate({ id });
      await utils.games.listMyGames.invalidate();
      await utils.games.listPublicPickup.invalidate();
      await utils.users.home.invalidate();
      await utils.games.searchPartnerUsers.invalidate({ gameId: id });
      await utils.games.listPartnerSuggestions.invalidate({ gameId: id });
      goGameHome();
    },
    onError: async (error) => {
      if (
        !isPartnerVacantSideRace({
          message: error.message,
          data: { code: error.data?.code },
        })
      ) {
        return;
      }
      setPartnerRaceMessage(PARTNER_VACANT_SIDE_RACE_MESSAGE);
      registerWithPartner.reset();
      setStep("pick");
      const fresh = await utils.games.byId.fetch({ id });
      if (partnerVacantSideRaceRecovery(fresh.sides) === "game_home") {
        recovered.current = true;
        toast.error(PARTNER_VACANT_SIDE_RACE_MESSAGE);
        goGameHome();
      }
    },
  });

  useEffect(() => {
    if (recovered.current || !data) {
      return;
    }
    if (
      offersPartnerJoin({
        canRegister: data.canRegister,
        format: data.format,
        registrationMode: data.registrationMode,
        sides: data.sides,
      })
    ) {
      return;
    }
    recovered.current = true;
    toast.error(PARTNER_JOIN_UNAVAILABLE_TOAST);
    goGameHome();
    // Home replace is the recovery; don't re-run for router identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open-gated recovery
  }, [data]);

  useEffect(() => {
    if (recovered.current || !suggestions.error) {
      return;
    }
    recovered.current = true;
    toast.error(
      globalFormErrorMessage(suggestions.error) ??
        PARTNER_JOIN_UNAVAILABLE_TOAST,
    );
    goGameHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refusal recovery
  }, [suggestions.error]);

  if (isNotFoundError(game.error)) {
    notFound();
  }

  if (game.isLoading) {
    return (
      <PartnerPageShell>
        <DetailPageSkeleton />
      </PartnerPageShell>
    );
  }

  if (game.error) {
    return (
      <PartnerPageShell>
        <ErrorState
          title="Game could not be loaded"
          message={game.error.message}
          onRetry={() => {
            void game.refetch();
          }}
        />
      </PartnerPageShell>
    );
  }

  if (!data || !offerPartner || suggestions.isError) {
    return (
      <PartnerPageShell>
        <DetailPageSkeleton />
      </PartnerPageShell>
    );
  }

  if (suggestions.isLoading) {
    return (
      <PartnerPageShell>
        <DetailPageSkeleton />
      </PartnerPageShell>
    );
  }

  const vacantSideIndex = firstFullyVacantSideIndex(data.sides);

  function confirmPartner(position: "left" | "right") {
    if (!selectedPartner) {
      return;
    }
    if (vacantSideIndex == null) {
      setPartnerRaceMessage(PARTNER_VACANT_SIDE_RACE_MESSAGE);
      recovered.current = true;
      toast.error(PARTNER_VACANT_SIDE_RACE_MESSAGE);
      goGameHome();
      return;
    }
    registerWithPartner.mutate({
      gameId: id,
      partnerUserId: selectedPartner.id,
      sideIndex: vacantSideIndex,
      position,
    });
  }

  return (
    <PartnerPageShell>
      {step === "review" && selectedPartner ? (
        <FriendlyGamePartnerReview
          partner={selectedPartner}
          viewerPreferredPosition={onboardingState.data?.preferredPosition}
          windowStart={data.windowStart}
          venueName={data.venue?.name ?? null}
          isOrganizer={data.isOrganizer}
          pricePerPlayerCents={data.pricePerPlayerCents}
          levelMinTenths={data.levelMinTenths}
          levelMaxTenths={data.levelMaxTenths}
          pending={registerWithPartner.isPending}
          errorMessage={globalFormErrorMessage(registerWithPartner.error)}
          onBack={() => {
            registerWithPartner.reset();
            setStep("pick");
          }}
          onRegister={confirmPartner}
        />
      ) : (
        <FriendlyGamePartnerPicker
          gameId={id}
          vacantSeatCount={vacantJoinSeats(data.sides).length}
          windowStart={data.windowStart}
          venueName={data.venue?.name ?? null}
          groupName={data.groupName}
          pricePerPlayerCents={data.pricePerPlayerCents}
          notice={partnerRaceMessage}
          selectedPartner={selectedPartner}
          onSelectedPartnerChange={setSelectedPartner}
          onBack={goBack}
          onClose={goGameHome}
          onContinue={() => {
            registerWithPartner.reset();
            setPartnerRaceMessage(null);
            setStep("review");
          }}
        />
      )}
    </PartnerPageShell>
  );
}

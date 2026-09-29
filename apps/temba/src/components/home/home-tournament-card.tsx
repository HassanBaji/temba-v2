"use client";

import { toast } from "sonner";

import { TournamentSummaryCard } from "~/components/games/tournament-summary-card";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api, type RouterOutputs } from "~/trpc/react";

type HomeTournamentGame =
  RouterOutputs["users"]["home"]["carouselGames"][number];

export function HomeTournamentCard({ game }: { game: HomeTournamentGame }) {
  const utils = api.useUtils();

  async function refresh() {
    await Promise.all([
      utils.users.home.invalidate(),
      utils.games.listMyGames.invalidate(),
      utils.games.byId.invalidate(),
    ]);
  }

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Seated");
      await refresh();
    },
    onError: async (error) => {
      toastGlobalFormError(error);
      await refresh();
    },
  });

  return (
    <TournamentSummaryCard
      as="article"
      game={game}
      href={`/dashboard/games/${game.id}`}
      groupName={game.groupName}
      actionPending={registerSeat.isPending}
      onJoinSeat={(sideIndex, position) => {
        registerSeat.mutate({ gameId: game.id, sideIndex, position });
      }}
      onJoinWaitlist={() => {
        registerSeat.mutate({ gameId: game.id });
      }}
    />
  );
}

"use client";

import { toast } from "sonner";

import { invalidateRatingReads } from "~/trpc/invalidate-rating-reads";
import { api, type RouterInputs, type RouterOutputs } from "~/trpc/react";

type Door<Name extends keyof RouterInputs["games"]> = {
  isPending: boolean;
  mutateAsync: (
    input: RouterInputs["games"][Name],
  ) => Promise<RouterOutputs["games"][Name]>;
};

/** What the Rounds screens may change; a preview passes stand-ins. */
export type TournamentRoundsActions = {
  generate: Door<"generateRounds">;
  save: Door<"saveRoundPairings">;
  swap: Door<"swapRoundPairing">;
  post: Door<"postRounds">;
  enterScore: Door<"enterTournamentScore">;
  confirm: Door<"confirmMatchResult">;
  notFinished: Door<"markMatchNotFinished">;
};

/** The Rounds query and every door that changes it, refreshing the Game after each. */
export function useTournamentRounds(gameId: string, enabled: boolean) {
  const utils = api.useUtils();
  const rounds = api.games.tournamentRounds.useQuery(
    { gameId },
    { enabled, refetchInterval: 30_000 },
  );

  async function refresh() {
    await Promise.all([
      utils.games.tournamentRounds.invalidate({ gameId }),
      utils.games.byId.invalidate({ id: gameId }),
    ]);
  }
  const options = {
    onSuccess: refresh,
    onError: (error: { message: string }) => {
      toast.error(error.message);
    },
  };

  const rated = {
    ...options,
    onSuccess: () => Promise.all([refresh(), invalidateRatingReads(utils)]),
  };

  const actions: TournamentRoundsActions = {
    generate: api.games.generateRounds.useMutation(options),
    save: api.games.saveRoundPairings.useMutation(options),
    swap: api.games.swapRoundPairing.useMutation(options),
    post: api.games.postRounds.useMutation(options),
    enterScore: api.games.enterTournamentScore.useMutation(rated),
    confirm: api.games.confirmMatchResult.useMutation(rated),
    notFinished: api.games.markMatchNotFinished.useMutation(options),
  };
  return { rounds, actions };
}

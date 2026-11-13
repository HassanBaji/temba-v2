"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

/** Which of a Game's Matches the viewer may stamp, and the door that stamps one (ADR-0072). */
export type MatchStamping = {
  canStamp: (matchId: string | null) => boolean;
  pending: boolean;
  onStamp: (matchId: string) => void;
};

export function useMatchStamping(game: {
  id: string;
  matches: readonly { id: string; canStamp?: boolean }[];
}): MatchStamping {
  const m = useMessages();
  const utils = api.useUtils();
  const stamp = api.games.stampMatch.useMutation({
    onSuccess: async () => {
      toast.success(m.rating.verifier.stamp.stamped);
      await Promise.all([
        utils.games.byId.invalidate({ id: game.id }),
        utils.games.tournamentRounds.invalidate({ gameId: game.id }),
        utils.games.listMatchesToStamp.invalidate(),
      ]);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const stampable = React.useMemo(
    () =>
      new Set(
        game.matches.flatMap((match) => (match.canStamp ? [match.id] : [])),
      ),
    [game.matches],
  );
  return {
    canStamp: (matchId) => matchId != null && stampable.has(matchId),
    pending: stamp.isPending,
    onStamp: (matchId) => stamp.mutate({ matchId }),
  };
}

export function StampScoreButton({
  matchId,
  stamping,
  className,
}: {
  matchId: string;
  stamping: MatchStamping;
  className?: string;
}) {
  const m = useMessages();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={cn("min-h-11 shrink-0", className)}
      onClick={() => stamping.onStamp(matchId)}
      pending={stamping.pending}
      pendingLabel={m.common.saving}
    >
      {m.rating.verifier.stamp.action}
    </Button>
  );
}

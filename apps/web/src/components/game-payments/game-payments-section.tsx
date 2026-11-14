"use client";

import { gamePaymentsHref } from "~/lib/dashboard-paths";

import { PaymentCard } from "./payment-card";
import { PaymentLineup } from "./payment-lineup";
import { useGamePayments, usePaymentActions } from "./use-game-payments";

/**
 * Everything payment on a Game page, shown only when the Game tracks
 * payments: the viewer's share, then the marks next to every name.
 */
export function GamePaymentsSection({
  gameId,
  tracked,
}: {
  gameId: string;
  tracked: boolean;
}) {
  const query = useGamePayments(gameId, tracked);
  const actions = usePaymentActions(gameId);
  const data = query.data;
  if (!tracked || !data?.tracked) {
    return null;
  }
  return (
    <div className="flex flex-col gap-6">
      {data.viewer ? (
        <PaymentCard
          payment={data.viewer}
          priceFils={data.priceFils}
          pending={actions.claim.isPending || actions.unclaim.isPending}
          onClaim={() => actions.claim.mutate({ gameId })}
          onUnclaim={() => actions.unclaim.mutate({ gameId })}
        />
      ) : null}
      <PaymentLineup
        payments={data}
        manageHref={data.canManage ? gamePaymentsHref(gameId) : undefined}
      />
    </div>
  );
}

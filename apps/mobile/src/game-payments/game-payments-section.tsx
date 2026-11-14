import { useRouter, type Href } from "expo-router";
import { View } from "react-native";

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
  const router = useRouter();
  const query = useGamePayments(gameId, tracked);
  const actions = usePaymentActions(gameId);
  const data = query.data;
  if (!tracked || !data?.tracked) {
    return null;
  }
  return (
    <View style={{ gap: 16 }}>
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
        onManage={
          data.canManage
            ? () => router.push(`/games/${gameId}/payments` as Href)
            : undefined
        }
      />
    </View>
  );
}

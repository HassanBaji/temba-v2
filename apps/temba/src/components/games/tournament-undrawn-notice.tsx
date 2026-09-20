import { Card } from "~/components/ui/card";
import {
  OPPONENTS_UNKNOWN_COPY,
  POOL_DRAW_NOT_HAPPENED_COPY,
  POOL_DRAW_RANDOM_COPY,
} from "~/lib/tournament-pool-draw";

export function TournamentUndrawnNotice() {
  return (
    <Card variant="outlined" className="space-y-2">
      <h3 className="text-title font-medium">Pool draw</h3>
      <p className="text-body">{POOL_DRAW_NOT_HAPPENED_COPY}</p>
      <p className="text-muted-foreground text-sm">{OPPONENTS_UNKNOWN_COPY}</p>
      <p className="text-muted-foreground text-sm">{POOL_DRAW_RANDOM_COPY}</p>
    </Card>
  );
}

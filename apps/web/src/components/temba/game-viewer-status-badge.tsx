import { Check, Hourglass } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import type { GameViewerStatus } from "~/lib/game-summary-cta";

export function GameViewerStatusBadge({
  status,
}: {
  status: Exclude<GameViewerStatus, null>;
}) {
  if (status === "in") {
    return (
      <Badge variant="success">
        <Check aria-hidden={true} strokeWidth={2.5} />
        Joined
      </Badge>
    );
  }

  return (
    <Badge variant="warning">
      <Hourglass aria-hidden={true} />
      Waitlisted
    </Badge>
  );
}

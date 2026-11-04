"use client";

import { Check, Hourglass } from "lucide-react";

import { useMessages } from "~/components/locale-provider";
import { Badge } from "~/components/ui/badge";
import type { GameViewerStatus } from "@repo/domain/game-summary-cta";

export function GameViewerStatusBadge({
  status,
}: {
  status: Exclude<GameViewerStatus, null>;
}) {
  const m = useMessages();
  if (status === "in") {
    return (
      <Badge variant="success">
        <Check aria-hidden={true} strokeWidth={2.5} />
        {m.webUi.viewerStatus.joined}
      </Badge>
    );
  }

  return (
    <Badge variant="warning">
      <Hourglass aria-hidden={true} />
      {m.webUi.viewerStatus.waitlisted}
    </Badge>
  );
}

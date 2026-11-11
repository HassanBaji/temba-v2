"use client";

import { Lock } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";

export function NoManagedVenues({ webOrigin }: { webOrigin?: string }) {
  const m = useMessages().consoleShell.noVenues;
  return (
    <EmptyState
      icon={Lock}
      title={m.title}
      description={m.description}
      action={
        webOrigin ? (
          <Button asChild variant="outline">
            <a href={webOrigin}>{m.backToTemba}</a>
          </Button>
        ) : undefined
      }
    />
  );
}

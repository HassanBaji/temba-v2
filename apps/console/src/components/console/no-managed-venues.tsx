import { Lock } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { Button } from "~/components/ui/button";

export function NoManagedVenues({ webOrigin }: { webOrigin?: string }) {
  return (
    <EmptyState
      icon={Lock}
      title="No Venues to manage"
      description="An Operator can make you a Venue manager. Until then there is nothing to run here."
      action={
        webOrigin ? (
          <Button asChild variant="outline">
            <a href={webOrigin}>Back to Temba</a>
          </Button>
        ) : undefined
      }
    />
  );
}

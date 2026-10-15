import { Lock } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { Button } from "~/components/ui/button";

export function NoManagedVenues() {
  return (
    <EmptyState
      icon={Lock}
      title="No Venues to manage"
      description="An Operator can make you a Venue manager. Until then there is nothing to manage here."
      action={
        <Button asChild>
          <Link href="/dashboard">Back to Home</Link>
        </Button>
      }
    />
  );
}

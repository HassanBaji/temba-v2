import Link from "next/link";

import { EmptyState } from "~/components/common/empty-state";
import { Button } from "~/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <EmptyState
        title="Not found"
        description="That Venue or page does not exist, or you do not manage it."
        action={
          <Button asChild variant="outline">
            <Link href="/">Your Venues</Link>
          </Button>
        }
      />
    </main>
  );
}

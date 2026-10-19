"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ConsolePage } from "~/components/console/console-page";
import { ConsoleShell } from "~/components/console/console-shell";
import { NoManagedVenues } from "~/components/console/no-managed-venues";
import { venuePath } from "~/lib/console-paths";
import { api } from "~/trpc/react";

const webOrigin = process.env.NEXT_PUBLIC_WEB_ORIGIN;

export default function ConsoleHomePage() {
  const router = useRouter();
  const venues = api.venues.listManaged.useQuery();
  const firstVenueId = venues.data?.[0]?.id;

  useEffect(() => {
    if (firstVenueId) {
      router.replace(venuePath(firstVenueId));
    }
  }, [firstVenueId, router]);

  return (
    <ConsoleShell webOrigin={webOrigin}>
      <ConsolePage>
        {venues.isLoading || firstVenueId ? (
          <ListPageSkeleton rows={3} />
        ) : null}
        {venues.error ? (
          <ErrorState
            title="Venues could not be loaded"
            message={venues.error.message}
            onRetry={() => {
              void venues.refetch();
            }}
          />
        ) : null}
        {venues.data?.length === 0 ? (
          <NoManagedVenues webOrigin={webOrigin} />
        ) : null}
      </ConsolePage>
    </ConsoleShell>
  );
}

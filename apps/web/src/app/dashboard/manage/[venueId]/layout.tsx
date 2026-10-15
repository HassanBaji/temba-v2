"use client";

import Link from "next/link";
import { notFound, usePathname } from "next/navigation";
import { use, type ReactNode } from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";
import { EntityHomeHeader } from "~/components/layout/entity-home-header";
import { NoManagedVenues } from "~/components/manage/no-managed-venues";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { isNotFoundError } from "@repo/domain/is-not-found-error";

const TABS = [
  { label: "Overview", segment: "" },
  { label: "Bookings", segment: "/bookings" },
  { label: "Customers", segment: "/customers" },
  { label: "Settings", segment: "/settings" },
  { label: "Reports", segment: "/reports" },
] as const;

export default function ManageVenueLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = use(params);
  const pathname = usePathname();
  const venue = api.venues.managedById.useQuery({ venueId });
  const base = `/dashboard/manage/${venueId}`;

  if (isNotFoundError(venue.error)) {
    notFound();
  }

  if (venue.isLoading) {
    return (
      <DashboardShell title="Manage" isSubPage>
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  if (venue.error?.data?.code === "FORBIDDEN") {
    return (
      <DashboardShell title="Manage" isSubPage>
        <NoManagedVenues />
      </DashboardShell>
    );
  }

  if (venue.error || !venue.data) {
    return (
      <DashboardShell title="Manage" isSubPage>
        <ErrorState
          title="Venue could not be loaded"
          message={venue.error?.message}
          onRetry={() => {
            void venue.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const data = venue.data;

  return (
    <DashboardShell title="Manage" hidePageHeader isSubPage>
      <div className="space-y-6">
        <EntityHomeHeader
          leading={
            <EntityMonogram
              name={data.name}
              image={data.logoImageUrl}
              size="lg"
            />
          }
          title={data.name}
          meta={`${data.city}, ${data.country}`}
          badges={
            data.acceptingBookings ? (
              <Badge variant="secondary">Accepting bookings</Badge>
            ) : data.archivedAt ? (
              <Badge variant="outline">Soft-archived</Badge>
            ) : undefined
          }
        />
        <nav aria-label="Venue sections" className="border-border border-b">
          <ul className="-mb-px flex gap-4 overflow-x-auto">
            {TABS.map((tab) => {
              const href = `${base}${tab.segment}`;
              const active =
                tab.segment === ""
                  ? pathname === base
                  : pathname.startsWith(href);
              return (
                <li key={tab.label}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "text-body inline-flex min-h-11 items-center border-b-2 px-1",
                      active
                        ? "border-foreground font-semibold"
                        : "text-muted-foreground border-transparent",
                    )}
                  >
                    {tab.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {children}
      </div>
    </DashboardShell>
  );
}

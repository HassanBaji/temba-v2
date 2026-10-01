"use client";

import { ErrorState } from "~/components/common/error-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { type RouterOutputs } from "~/trpc/react";

type LiveVenue = RouterOutputs["communities"]["searchLiveVenues"][number];

export function CommunityLinkVenueDialog({
  open,
  onOpenChange,
  query,
  onQueryChange,
  venues,
  isLoading,
  errorMessage,
  onRetry,
  pendingVenueId,
  onRequest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  venues: LiveVenue[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  pendingVenueId: string | null;
  onRequest: (venueId: string) => void;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Link a Venue</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Search live Venues by name, city, or country.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-4 px-4 pb-4 md:px-0 md:pb-0">
          <Field>
            <FieldLabel htmlFor="venue-search">Search Venues</FieldLabel>
            <Input
              id="venue-search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </Field>
          {isLoading ? <Skeleton className="h-16 w-full" /> : null}
          {errorMessage ? (
            <ErrorState
              headingLevel={3}
              className="py-6"
              title="Venues could not be loaded"
              message={errorMessage}
              onRetry={onRetry}
            />
          ) : null}
          {venues?.length === 0 ? (
            <p className="text-body text-muted-foreground">
              No live Venues match.
            </p>
          ) : null}
          {venues && venues.length > 0 ? (
            <ul className="divide-rule border-rule divide-y overflow-hidden rounded-[14px] border">
              {venues.map((venue) => (
                <li
                  key={venue.id}
                  className="flex min-w-0 items-center gap-3.5 px-5 py-[18px]"
                >
                  <EntityMonogram name={venue.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-body break-words font-semibold">
                      {venue.name}
                    </p>
                    <p className="text-meta text-muted-foreground break-words">
                      {venue.city}, {venue.country}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={`Request a link to ${venue.name}`}
                    disabled={pendingVenueId !== null}
                    pending={pendingVenueId === venue.id}
                    pendingLabel="Requesting…"
                    onClick={() => onRequest(venue.id)}
                    className="border-ink h-10 min-h-10 shrink-0 rounded-[10px] font-semibold"
                  >
                    Request link
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

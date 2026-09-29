"use client";

import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
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
            <RowList>
              {venues.map((venue) => (
                <ListRow
                  key={venue.id}
                  stackTrailing
                  title={venue.name}
                  meta={`${venue.city}, ${venue.country}`}
                  trailing={
                    <Button
                      aria-label={`Request a link to ${venue.name}`}
                      disabled={pendingVenueId !== null}
                      pending={pendingVenueId === venue.id}
                      pendingLabel="Requesting…"
                      onClick={() => onRequest(venue.id)}
                    >
                      Request link
                    </Button>
                  }
                />
              ))}
            </RowList>
          ) : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

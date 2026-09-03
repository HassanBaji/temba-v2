"use client";

import { RowList } from "~/components/common/row-list";
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
  pending,
  onRequest,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (value: string) => void;
  venues: LiveVenue[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  pending: boolean;
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
            <p className="text-destructive text-body">{errorMessage}</p>
          ) : null}
          {venues?.length === 0 ? (
            <p className="text-body text-muted-foreground">
              No live Venues match.
            </p>
          ) : null}
          {venues && venues.length > 0 ? (
            <RowList>
              {venues.map((venue) => (
                <li
                  key={venue.id}
                  className="flex min-h-16 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-lead font-semibold">{venue.name}</p>
                    <p className="text-meta text-muted-foreground">
                      {venue.city}, {venue.country}
                    </p>
                  </div>
                  <Button
                    className="min-h-11"
                    disabled={pending}
                    onClick={() => onRequest(venue.id)}
                  >
                    Request link
                  </Button>
                </li>
              ))}
            </RowList>
          ) : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

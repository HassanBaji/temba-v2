"use client";

import { Lock, Search } from "lucide-react";
import * as React from "react";

import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { FieldDescription, FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { SelectCard } from "~/components/ui/select-card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import {
  venueCardMeta,
  venueMatchesQuery,
  visibleCreateGroups,
  VISIBLE_GROUP_CHIP_COUNT,
} from "~/lib/create-game-flow";

export type CreateCourt = { id: string; name: string };

export type CreateVenue = {
  id: string;
  name: string;
  city: string;
  courts: CreateCourt[];
};

function VenueCards({
  venues,
  venueId,
  labelledBy,
  invalid = false,
  describedBy,
  onSelect,
}: {
  venues: readonly CreateVenue[];
  venueId: string;
  labelledBy?: string;
  invalid?: boolean;
  describedBy?: string;
  onSelect: (venueId: string) => void;
}) {
  return (
    <RovingRadioGroup
      id={labelledBy ? "game-venue" : undefined}
      aria-label={labelledBy ? undefined : "Venue"}
      aria-labelledby={labelledBy}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      tabIndex={labelledBy ? -1 : undefined}
      className="border-rule rounded-card overflow-hidden border outline-none"
    >
      {venues.map((venue) => (
        <SelectCard
          key={venue.id}
          role="radio"
          layout="row"
          selected={venue.id === venueId}
          title={venue.name}
          description={venueCardMeta(venue.courts.length, venue.city)}
          trailing="check"
          onClick={() => {
            onSelect(venue.id);
          }}
        />
      ))}
    </RovingRadioGroup>
  );
}

export function VenueField({
  selectedGroupId,
  venueCopy,
  venues,
  venuesLocked,
  venuesPending,
  venueId,
  venueError,
  onVenueId,
  emptyCatalog,
}: {
  selectedGroupId: string;
  venueCopy: string;
  venues: readonly CreateVenue[];
  venuesLocked: boolean;
  venuesPending: boolean;
  venueId: string;
  venueError?: string;
  onVenueId: (venueId: string) => void;
  emptyCatalog: boolean;
}) {
  const [venuesOpen, setVenuesOpen] = React.useState(false);
  const [venueQuery, setVenueQuery] = React.useState("");
  const visibleVenues = visibleCreateGroups(venues, venueId);
  const filteredVenues = venues.filter((venue) =>
    venueMatchesQuery(venue, venueQuery),
  );

  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        id="game-venue-label"
        title="Venue"
        meta={selectedGroupId ? "Required" : undefined}
      />
      {!selectedGroupId ? (
        <div className="border-rule hatch rounded-card flex min-h-11 items-center gap-3 px-[18px] py-4">
          <Lock
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
          <p className="text-muted-foreground text-body">{venueCopy}</p>
        </div>
      ) : null}
      {selectedGroupId && venuesPending ? (
        <div
          aria-busy="true"
          className="border-rule rounded-card overflow-hidden border"
        >
          <span className="sr-only">Loading Venues</span>
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="border-rule border-b px-[18px] py-4 last:border-b-0"
            >
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="mt-1.5 h-3.5 w-28 max-w-full" />
            </div>
          ))}
        </div>
      ) : null}
      {selectedGroupId && !venuesPending && venuesLocked ? (
        <div
          id="game-venue"
          tabIndex={-1}
          className="border-rule rounded-card border px-[18px] py-4 outline-none"
        >
          <p className="font-semibold">{venues[0]?.name ?? "Venue"}</p>
          {venues[0] ? (
            <p className="text-muted-foreground text-meta mt-0.5">
              {venueCardMeta(venues[0].courts.length, venues[0].city)}
            </p>
          ) : null}
        </div>
      ) : null}
      {selectedGroupId && !venuesPending && emptyCatalog ? (
        <div id="game-venue" tabIndex={-1} className="outline-none" />
      ) : null}
      {selectedGroupId && !venuesPending && !venuesLocked && !emptyCatalog ? (
        <>
          <VenueCards
            venues={visibleVenues}
            venueId={venueId}
            labelledBy="game-venue-label"
            invalid={Boolean(venueError)}
            describedBy={venueError ? "game-venue-error" : "game-venue-copy"}
            onSelect={onVenueId}
          />
          {venues.length > VISIBLE_GROUP_CHIP_COUNT ? (
            <ChoiceChip
              dashed
              onClick={() => {
                setVenueQuery("");
                setVenuesOpen(true);
              }}
            >
              <Search aria-hidden="true" className="size-3.5" />
              All {venues.length} venues
            </ChoiceChip>
          ) : null}
          <Sheet open={venuesOpen} onOpenChange={setVenuesOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[85svh] overflow-hidden"
            >
              <SheetHeader>
                <SheetTitle>All {venues.length} venues</SheetTitle>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
                <Input
                  value={venueQuery}
                  onChange={(event) => {
                    setVenueQuery(event.target.value);
                  }}
                  placeholder="Search venues"
                  aria-label="Search venues"
                />
                {filteredVenues.length === 0 ? (
                  <p className="text-muted-foreground text-body">
                    No venues match.
                  </p>
                ) : (
                  <VenueCards
                    venues={filteredVenues}
                    venueId={venueId}
                    onSelect={(nextVenueId) => {
                      onVenueId(nextVenueId);
                      setVenuesOpen(false);
                    }}
                  />
                )}
              </div>
            </SheetContent>
          </Sheet>
        </>
      ) : null}
      {selectedGroupId ? (
        <FieldDescription id="game-venue-copy">{venueCopy}</FieldDescription>
      ) : null}
      <FieldError id="game-venue-error">
        {venueError ??
          (emptyCatalog
            ? "No live Venues. Create is not available."
            : undefined)}
      </FieldError>
    </section>
  );
}

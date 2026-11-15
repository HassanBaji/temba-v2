"use client";

import { Lock, Search } from "lucide-react";
import * as React from "react";

import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { useLocale, useMessages } from "~/components/locale-provider";
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
} from "@repo/domain/create-game-flow";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";

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
  sport,
  labelledBy,
  invalid = false,
  describedBy,
  onSelect,
}: {
  venues: readonly CreateVenue[];
  venueId: string;
  sport: Sport;
  labelledBy?: string;
  invalid?: boolean;
  describedBy?: string;
  onSelect: (venueId: string) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  return (
    <RovingRadioGroup
      id={labelledBy ? "game-venue" : undefined}
      aria-label={labelledBy ? undefined : m.webDashboard.venue.title}
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
          description={venueCardMeta(
            venue.courts.length,
            venue.city,
            locale,
            sport,
          )}
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
  unlocked,
  venueCopy,
  venues,
  venuesLocked,
  venuesPending,
  venueId,
  venueError,
  onVenueId,
  emptyCatalog,
  emptyCatalogMessage,
  sport = DEFAULT_SPORT,
}: {
  unlocked: boolean;
  venueCopy: string;
  venues: readonly CreateVenue[];
  venuesLocked: boolean;
  venuesPending: boolean;
  venueId: string;
  venueError?: string;
  onVenueId: (venueId: string) => void;
  emptyCatalog: boolean;
  /** Replaces the no live Venues line, as on a Public Game. */
  emptyCatalogMessage?: string;
  sport?: Sport;
}) {
  const m = useMessages();
  const locale = useLocale();
  const c = m.webDashboard.createGame;
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
        title={m.webDashboard.venue.title}
        meta={unlocked ? m.common.required : undefined}
      />
      {!unlocked ? (
        <div className="border-rule hatch rounded-card flex min-h-11 items-center gap-3 px-[18px] py-4">
          <Lock
            aria-hidden="true"
            className="text-muted-foreground size-4 shrink-0"
          />
          <p className="text-muted-foreground text-body">{venueCopy}</p>
        </div>
      ) : null}
      {unlocked && venuesPending ? (
        <div
          aria-busy="true"
          className="border-rule rounded-card overflow-hidden border"
        >
          <span className="sr-only">{c.loadingVenues}</span>
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
      {unlocked && !venuesPending && venuesLocked ? (
        <div
          id="game-venue"
          tabIndex={-1}
          className="border-rule rounded-card border px-[18px] py-4 outline-none"
        >
          <p className="font-semibold">
            {venues[0]?.name ?? m.webDashboard.venue.title}
          </p>
          {venues[0] ? (
            <p className="text-muted-foreground text-meta mt-0.5">
              {venueCardMeta(
                venues[0].courts.length,
                venues[0].city,
                locale,
                sport,
              )}
            </p>
          ) : null}
        </div>
      ) : null}
      {unlocked && !venuesPending && emptyCatalog ? (
        <div id="game-venue" tabIndex={-1} className="outline-none" />
      ) : null}
      {unlocked && !venuesPending && !venuesLocked && !emptyCatalog ? (
        <>
          <VenueCards
            sport={sport}
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
              {c.allVenues(venues.length)}
            </ChoiceChip>
          ) : null}
          <Sheet open={venuesOpen} onOpenChange={setVenuesOpen}>
            <SheetContent
              side="bottom"
              className="max-h-[85svh] overflow-hidden"
            >
              <SheetHeader>
                <SheetTitle>{c.allVenues(venues.length)}</SheetTitle>
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4">
                <Input
                  value={venueQuery}
                  onChange={(event) => {
                    setVenueQuery(event.target.value);
                  }}
                  placeholder={c.searchVenues}
                  aria-label={c.searchVenues}
                />
                {filteredVenues.length === 0 ? (
                  <p className="text-muted-foreground text-body">
                    {c.noVenuesMatch}
                  </p>
                ) : (
                  <VenueCards
                    sport={sport}
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
      {unlocked ? (
        <FieldDescription id="game-venue-copy">{venueCopy}</FieldDescription>
      ) : null}
      <FieldError id="game-venue-error">
        {venueError ??
          (emptyCatalog ? (emptyCatalogMessage ?? c.noLiveVenues) : undefined)}
      </FieldError>
    </section>
  );
}

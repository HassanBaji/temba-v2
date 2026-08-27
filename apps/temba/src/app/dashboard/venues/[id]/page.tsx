"use client";

import Link from "next/link";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

function parseOptionalCoord(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function coordToInput(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return value;
}

export default function VenueHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = api.useUtils();
  const venue = api.venues.byId.useQuery({ id });

  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [latitude, setLatitude] = React.useState("");
  const [longitude, setLongitude] = React.useState("");
  const [hydratedId, setHydratedId] = React.useState<string | null>(null);
  const [newCourtName, setNewCourtName] = React.useState("");
  const [courtNames, setCourtNames] = React.useState<Record<string, string>>(
    {},
  );

  React.useEffect(() => {
    if (!venue.data || hydratedId === venue.data.id) {
      return;
    }
    setName(venue.data.name);
    setCity(venue.data.city);
    setCountry(venue.data.country);
    setLatitude(coordToInput(venue.data.latitude));
    setLongitude(coordToInput(venue.data.longitude));
    setHydratedId(venue.data.id);
  }, [venue.data, hydratedId]);

  React.useEffect(() => {
    if (!venue.data) {
      return;
    }
    setCourtNames((current) => {
      const next: Record<string, string> = {};
      for (const court of venue.data.courts) {
        next[court.id] = current[court.id] ?? court.name;
      }
      return next;
    });
  }, [venue.data]);

  const updateVenue = api.venues.update.useMutation({
    onSuccess: async () => {
      toast.success("Venue updated");
      await utils.venues.byId.invalidate({ id });
      await utils.venues.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const addCourt = api.venues.addCourt.useMutation({
    onSuccess: async () => {
      toast.success("Court added");
      setNewCourtName("");
      await utils.venues.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const renameCourt = api.venues.renameCourt.useMutation({
    onSuccess: async () => {
      toast.success("Court renamed");
      await utils.venues.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteCourt = api.venues.deleteCourt.useMutation({
    onSuccess: async () => {
      toast.success("Court deleted");
      await utils.venues.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateVenue.mutate({
      id,
      name,
      city,
      country,
      latitude: parseOptionalCoord(latitude),
      longitude: parseOptionalCoord(longitude),
    });
  }

  function onAddCourt(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addCourt.mutate({ venueId: id, name: newCourtName });
  }

  return (
    <DashboardShell title="Venue">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            {venue.data?.name ?? "Venue"}
          </h2>
          <p className="text-muted-foreground text-sm">
            Edit name, city, country, and optional coordinates. Courts are named
            playing surfaces on this Venue.
          </p>
        </div>

        {venue.isLoading ? <Skeleton className="h-64 w-full" /> : null}

        {venue.error ? (
          <p className="text-destructive text-sm">{venue.error.message}</p>
        ) : null}

        {venue.data ? (
          <>
            <form
              onSubmit={onSubmit}
              className="border-border bg-card space-y-6 rounded-xl border p-6"
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="venue-name">Name</FieldLabel>
                  <Input
                    id="venue-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    required
                    maxLength={255}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="venue-city">City</FieldLabel>
                  <Input
                    id="venue-city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    required
                    maxLength={255}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="venue-country">Country</FieldLabel>
                  <Input
                    id="venue-country"
                    value={country}
                    onChange={(event) => setCountry(event.target.value)}
                    required
                    maxLength={255}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="venue-latitude">Latitude</FieldLabel>
                  <Input
                    id="venue-latitude"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    placeholder="Optional"
                  />
                  <FieldDescription>
                    Optional. Range −90 to 90.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="venue-longitude">Longitude</FieldLabel>
                  <Input
                    id="venue-longitude"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    placeholder="Optional"
                  />
                  <FieldDescription>
                    Optional. Range −180 to 180.
                  </FieldDescription>
                </Field>
              </FieldGroup>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={updateVenue.isPending}>
                  {updateVenue.isPending ? "Saving…" : "Save"}
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/venues">Back to Venues</Link>
                </Button>
              </div>
            </form>

            <section className="border-border bg-card space-y-4 rounded-xl border p-6">
              <div className="space-y-1">
                <h3 className="text-foreground text-lg font-medium">Courts</h3>
                <p className="text-muted-foreground text-sm">
                  A Venue may have zero Courts. Names are unique on this Venue
                  after trim and case-fold.
                </p>
              </div>

              <form onSubmit={onAddCourt} className="flex flex-wrap gap-3">
                <Input
                  value={newCourtName}
                  onChange={(event) => setNewCourtName(event.target.value)}
                  placeholder="Court 1"
                  required
                  maxLength={255}
                  className="min-w-48 flex-1"
                />
                <Button type="submit" disabled={addCourt.isPending}>
                  {addCourt.isPending ? "Adding…" : "Add Court"}
                </Button>
              </form>

              {venue.data.courts.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No Courts yet. This Venue can stay empty.
                </p>
              ) : (
                <ul className="divide-border border-border divide-y rounded-lg border">
                  {venue.data.courts.map((court) => (
                    <li
                      key={court.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                    >
                      <Input
                        value={courtNames[court.id] ?? court.name}
                        onChange={(event) =>
                          setCourtNames((current) => ({
                            ...current,
                            [court.id]: event.target.value,
                          }))
                        }
                        maxLength={255}
                        required
                        aria-label={`Court name ${court.name}`}
                        className="flex-1"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          disabled={renameCourt.isPending}
                          onClick={() =>
                            renameCourt.mutate({
                              id: court.id,
                              name: courtNames[court.id] ?? court.name,
                            })
                          }
                        >
                          Rename
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={deleteCourt.isPending}
                          onClick={() => deleteCourt.mutate({ id: court.id })}
                        >
                          Delete
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

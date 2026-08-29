"use client";

import Link from "next/link";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { coordToInput, parseOptionalCoord } from "~/lib/parse-optional-coord";
import { api } from "~/trpc/react";

const LOGO_MAX_BYTES = 2 * 1024 * 1024;

type LogoContentType = "image/jpeg" | "image/png" | "image/webp";

function asLogoContentType(value: string): LogoContentType | null {
  if (value === "image/jpg") {
    return "image/jpeg";
  }
  if (
    value === "image/jpeg" ||
    value === "image/png" ||
    value === "image/webp"
  ) {
    return value;
  }
  return null;
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
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

  const uploadLogo = api.venues.uploadLogo.useMutation({
    onSuccess: async () => {
      toast.success("Logo saved");
      await utils.venues.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const clearLogo = api.venues.clearLogo.useMutation({
    onSuccess: async () => {
      toast.success("Logo cleared");
      await utils.venues.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const softArchive = api.venues.softArchive.useMutation({
    onSuccess: async () => {
      toast.success("Venue Soft-archived");
      await utils.venues.byId.invalidate({ id });
      await utils.venues.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unarchive = api.venues.unarchive.useMutation({
    onSuccess: async () => {
      toast.success("Venue unarchived");
      await utils.venues.byId.invalidate({ id });
      await utils.venues.list.invalidate();
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

  async function onLogoFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    const contentType = asLogoContentType(file.type);
    if (!contentType) {
      toast.error("Logo must be a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      toast.error("Logo must be at most 2 MB");
      return;
    }
    const dataBase64 = await fileToBase64(file);
    uploadLogo.mutate({ venueId: id, contentType, dataBase64 });
  }

  return (
    <DashboardShell
      title={venue.data?.name ?? "Venue"}
      description="Edit name, city, country, and optional coordinates. Courts are named playing surfaces on this Venue."
    >
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            {venue.data?.archivedAt ? (
              <Badge variant="outline">Soft-archived</Badge>
            ) : null}
          </div>
          {venue.data ? (
            <div className="flex flex-wrap gap-2">
              {venue.data.archivedAt ? (
                <Button
                  type="button"
                  onClick={() => unarchive.mutate({ id })}
                  disabled={unarchive.isPending || softArchive.isPending}
                >
                  {unarchive.isPending ? "Unarchiving…" : "Unarchive"}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => softArchive.mutate({ id })}
                  disabled={softArchive.isPending || unarchive.isPending}
                >
                  {softArchive.isPending ? "Archiving…" : "Soft-archive"}
                </Button>
              )}
            </div>
          ) : null}
        </div>

        {venue.data?.archivedAt ? (
          <SoftArchiveBanner heading="This Venue is Soft-archived">
            It is hidden from the Community request catalog. You can still edit
            fields, Courts, and logo. Unarchive to restore it to the live
            catalog. Live Community links stay.
          </SoftArchiveBanner>
        ) : null}

        {venue.data ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Linked Communities
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Communities that currently have a live Venue link. Sharing a
                Venue does not change membership.
              </p>
            </div>
            {venue.data.linkedCommunities.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No Communities are live-linked to this Venue.
              </p>
            ) : (
              <ul className="divide-border border-border divide-y rounded-lg border">
                {venue.data.linkedCommunities.map((community) => (
                  <li
                    key={community.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <p className="text-foreground font-medium">
                      {community.name}
                    </p>
                    {community.archivedAt ? (
                      <Badge variant="outline">Soft-archived</Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

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
                <h3 className="text-foreground text-lg font-medium">Logo</h3>
                <p className="text-muted-foreground text-sm">
                  Optional. JPEG, PNG, or WebP, at most 2 MB. Display uses the
                  public URL.
                </p>
              </div>

              {venue.data.logoImageUrl ? (
                // Public catalog URL (ADR-0006); not a signed URL.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={venue.data.logoImageUrl}
                  alt={`${venue.data.name} logo`}
                  className="border-border h-24 w-24 rounded-md border object-cover"
                />
              ) : (
                <p className="text-muted-foreground text-sm">No logo yet.</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    void onLogoFileChange(event);
                  }}
                  disabled={uploadLogo.isPending || clearLogo.isPending}
                />
                {venue.data.logoImageUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={clearLogo.isPending || uploadLogo.isPending}
                    onClick={() => clearLogo.mutate({ venueId: id })}
                  >
                    {clearLogo.isPending ? "Clearing…" : "Clear logo"}
                  </Button>
                ) : null}
              </div>
            </section>

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

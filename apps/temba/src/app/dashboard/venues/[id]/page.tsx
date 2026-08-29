"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";
import { Section } from "~/components/layout/section";
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
import { isNotFoundError } from "~/lib/is-not-found-error";
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
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [deleteCourtId, setDeleteCourtId] = React.useState<string | null>(null);
  const [clearLogoOpen, setClearLogoOpen] = React.useState(false);
  const [archiveOpen, setArchiveOpen] = React.useState(false);

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
  });

  const uploadLogo = api.venues.uploadLogo.useMutation({
    onSuccess: async () => {
      toast.success("Logo saved");
      setLogoError(null);
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
  });

  const softArchive = api.venues.softArchive.useMutation({
    onSuccess: async () => {
      toast.success("Venue Soft-archived");
      await utils.venues.byId.invalidate({ id });
      await utils.venues.list.invalidate();
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
      setLogoError("Logo must be a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError("Logo must be at most 2 MB");
      return;
    }
    setLogoError(null);
    const dataBase64 = await fileToBase64(file);
    uploadLogo.mutate({ venueId: id, contentType, dataBase64 });
  }

  if (isNotFoundError(venue.error)) {
    notFound();
  }

  if (venue.isLoading) {
    return (
      <DashboardShell title="Venue">
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  if (venue.error) {
    return (
      <DashboardShell title="Venue">
        <ErrorState
          title="Venue could not be loaded"
          message={venue.error.message}
          onRetry={() => {
            void venue.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (!venue.data) {
    return (
      <DashboardShell title="Venue">
        <ErrorState
          title="Venue could not be loaded"
          onRetry={() => {
            void venue.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const data = venue.data;
  const venueName = data.name;
  const deleteCourtName =
    data.courts.find((court) => court.id === deleteCourtId)?.name ?? "Court";

  return (
    <DashboardShell
      title={venueName}
      description="Edit name, city, country, and optional coordinates. Courts are named playing surfaces on this Venue."
      action={
        data.archivedAt ? (
          <Button
            type="button"
            className="min-h-11"
            onClick={() => unarchive.mutate({ id })}
            disabled={unarchive.isPending}
          >
            {unarchive.isPending ? "Unarchiving…" : "Unarchive"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={() => setArchiveOpen(true)}
          >
            Soft-archive
          </Button>
        )
      }
    >
      <div className="space-y-8">
        {data.archivedAt ? (
          <SoftArchiveBanner heading="This Venue is Soft-archived">
            It is hidden from the Community request catalog. You can still edit
            fields, Courts, and logo. Unarchive to restore it to the live
            catalog. Live Community links stay.
          </SoftArchiveBanner>
        ) : null}

        <Section
          title="Linked Communities"
          description="Communities that currently have a live Venue link. Sharing a Venue does not change membership."
        >
          {data.linkedCommunities.length === 0 ? (
            <p className="text-body text-muted-foreground">
              No Communities are live-linked to this Venue.
            </p>
          ) : (
            <RowList>
              {data.linkedCommunities.map((community) => (
                <ListRow
                  key={community.id}
                  title={community.name}
                  trailing={
                    community.archivedAt ? (
                      <Badge variant="outline">Soft-archived</Badge>
                    ) : undefined
                  }
                />
              ))}
            </RowList>
          )}
        </Section>

        <Section title="Details">
          <form onSubmit={onSubmit} className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="venue-name">Name</FieldLabel>
                <Input
                  id="venue-name"
                  className="min-h-11"
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
                  className="min-h-11"
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
                  className="min-h-11"
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
                  className="min-h-11"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="Optional"
                />
                <FieldDescription>Optional. Range −90 to 90.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="venue-longitude">Longitude</FieldLabel>
                <Input
                  id="venue-longitude"
                  className="min-h-11"
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
              <Button
                type="submit"
                className="min-h-11"
                disabled={updateVenue.isPending}
              >
                {updateVenue.isPending ? "Saving…" : "Save"}
              </Button>
              <Button variant="outline" className="min-h-11" asChild>
                <Link href="/dashboard/venues">Back to Venues</Link>
              </Button>
            </div>
          </form>
        </Section>

        <Section
          title="Logo"
          description="Optional. JPEG, PNG, or WebP, at most 2 MB. Display uses the public URL."
        >
          {data.logoImageUrl ? (
            // Public catalog URL (ADR-0006); not a signed URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.logoImageUrl}
              alt={`${data.name} logo`}
              className="size-24 rounded-lg object-cover"
            />
          ) : (
            <p className="text-body text-muted-foreground">No logo yet.</p>
          )}
          <Field>
            <FieldLabel htmlFor="venue-logo">Upload logo</FieldLabel>
            <Input
              id="venue-logo"
              className="min-h-11"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-invalid={logoError ? true : undefined}
              aria-describedby={logoError ? "venue-logo-error" : undefined}
              onChange={(event) => {
                void onLogoFileChange(event);
              }}
              disabled={uploadLogo.isPending || clearLogo.isPending}
            />
            {logoError ? (
              <p
                id="venue-logo-error"
                role="alert"
                className="text-destructive text-meta"
              >
                {logoError}
              </p>
            ) : null}
          </Field>
          {data.logoImageUrl ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              disabled={clearLogo.isPending || uploadLogo.isPending}
              onClick={() => setClearLogoOpen(true)}
            >
              Clear logo
            </Button>
          ) : null}
        </Section>

        <Section
          title="Courts"
          description="A Venue may have zero Courts. Names are unique on this Venue after trim and case-fold."
        >
          <form
            onSubmit={onAddCourt}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <label className="sr-only" htmlFor="new-court-name">
              New Court name
            </label>
            <Input
              id="new-court-name"
              className="min-h-11 min-w-48 flex-1"
              value={newCourtName}
              onChange={(event) => setNewCourtName(event.target.value)}
              placeholder="Court 1"
              required
              maxLength={255}
            />
            <Button
              type="submit"
              className="min-h-11"
              disabled={addCourt.isPending}
            >
              {addCourt.isPending ? "Adding…" : "Add Court"}
            </Button>
          </form>

          {data.courts.length === 0 ? (
            <p className="text-body text-muted-foreground">
              No Courts yet. This Venue can stay empty.
            </p>
          ) : (
            <RowList>
              {data.courts.map((court) => (
                <li
                  key={court.id}
                  className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <label className="sr-only" htmlFor={`court-name-${court.id}`}>
                    Court name {court.name}
                  </label>
                  <Input
                    id={`court-name-${court.id}`}
                    className="min-h-11 flex-1"
                    value={courtNames[court.id] ?? court.name}
                    onChange={(event) =>
                      setCourtNames((current) => ({
                        ...current,
                        [court.id]: event.target.value,
                      }))
                    }
                    maxLength={255}
                    required
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
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
                      className="min-h-11"
                      disabled={deleteCourt.isPending}
                      onClick={() => setDeleteCourtId(court.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </RowList>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={deleteCourtId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCourtId(null);
          }
        }}
        title={`Delete ${deleteCourtName}?`}
        description="This cannot be undone. Cancelling does nothing."
        confirmLabel="Delete Court"
        pending={deleteCourt.isPending}
        onConfirm={async () => {
          if (!deleteCourtId) {
            return;
          }
          await deleteCourt.mutateAsync({ id: deleteCourtId });
        }}
      />

      <ConfirmDialog
        open={clearLogoOpen}
        onOpenChange={setClearLogoOpen}
        title={`Clear logo for ${venueName}?`}
        description="The current logo will be removed. Cancelling does nothing."
        confirmLabel="Clear logo"
        pending={clearLogo.isPending}
        onConfirm={async () => {
          await clearLogo.mutateAsync({ venueId: id });
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={`Soft-archive ${venueName}?`}
        description="It is hidden from the Community request catalog. Live Community links stay. Cancelling does nothing."
        confirmLabel="Soft-archive Venue"
        pending={softArchive.isPending}
        onConfirm={async () => {
          await softArchive.mutateAsync({ id });
        }}
      />
    </DashboardShell>
  );
}

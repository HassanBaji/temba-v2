"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EntityImageField } from "~/components/common/entity-image-field";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { RowList } from "~/components/common/row-list";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { EntityHomeHeader } from "~/components/layout/entity-home-header";
import { Section } from "~/components/layout/section";
import { VenueLinkedGroupsSection } from "~/components/venues/venue-linked-groups-section";
import { VenueManagersSection } from "~/components/venues/venue-managers-section";
import { SoftArchiveBanner } from "~/components/temba/soft-archive-banner";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { entityImageUploadInput } from "@repo/domain/entity-image-file";
import { courtRenameIsDirty } from "@repo/domain/court-rename";
import { SPORTS, sportLabel, type Sport } from "@repo/domain/sport";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  coordToInput,
  parseOptionalCoord,
} from "@repo/domain/parse-optional-coord";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

export default function VenueHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const m = useMessages();
  const locale = useLocale();
  const v = m.webDashboard.venue;
  const utils = api.useUtils();
  const venue = api.venues.byId.useQuery({ id });

  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [country, setCountry] = React.useState("");
  const [latitude, setLatitude] = React.useState("");
  const [longitude, setLongitude] = React.useState("");
  const [hydratedId, setHydratedId] = React.useState<string | null>(null);
  const [newCourtName, setNewCourtName] = React.useState("");
  const [newCourtSport, setNewCourtSport] = React.useState<Sport>("padel");
  const [courtNames, setCourtNames] = React.useState<Record<string, string>>(
    {},
  );
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [deleteCourtId, setDeleteCourtId] = React.useState<string | null>(null);
  const [clearLogoOpen, setClearLogoOpen] = React.useState(false);
  const detailsSummaryRef = React.useRef<HTMLDivElement>(null);
  const courtSummaryRef = React.useRef<HTMLDivElement>(null);
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
      toast.success(v.toast.updated);
      await utils.venues.byId.invalidate({ id });
      await utils.venues.list.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        {
          name: "venue-name",
          city: "venue-city",
          country: "venue-country",
          latitude: "venue-latitude",
          longitude: "venue-longitude",
        },
        detailsSummaryRef.current,
      );
    },
  });

  const addCourt = api.venues.addCourt.useMutation({
    onSuccess: async () => {
      toast.success(v.toast.courtAdded);
      setNewCourtName("");
      setNewCourtSport("padel");
      await utils.venues.byId.invalidate({ id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        { name: "new-court-name" },
        courtSummaryRef.current,
      );
    },
  });

  const renameCourt = api.venues.renameCourt.useMutation({
    onSuccess: async () => {
      toast.success(v.toast.courtRenamed);
      await utils.venues.byId.invalidate({ id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const setCourtSport = api.venues.setCourtSport.useMutation({
    onSuccess: async () => {
      toast.success(v.toast.courtSportUpdated);
      await utils.venues.byId.invalidate({ id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const deleteCourt = api.venues.deleteCourt.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(v.toast.courtDeleted);
      await utils.venues.byId.invalidate({ id });
    },
  });

  const uploadLogo = api.venues.uploadLogo.useMutation({
    onSuccess: async () => {
      toast.success(v.toast.logoSaved);
      setLogoError(null);
      await utils.venues.byId.invalidate({ id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
      setLogoError(error.message);
    },
  });

  const clearLogo = api.venues.clearLogo.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(v.toast.logoCleared);
      await utils.venues.byId.invalidate({ id });
    },
  });

  const softArchive = api.venues.softArchive.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(v.toast.archived);
      await utils.venues.byId.invalidate({ id });
      await utils.venues.list.invalidate();
    },
  });

  const unarchive = api.venues.unarchive.useMutation({
    onSuccess: async () => {
      toast.success(v.toast.unarchived);
      await utils.venues.byId.invalidate({ id });
      await utils.venues.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const setPartner = api.venues.setPartner.useMutation({
    onSuccess: async (result) => {
      toast.success(result.isPartner ? v.partner.onToast : v.partner.offToast);
      await utils.venues.byId.invalidate({ id });
      await utils.venues.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updateVenue.isPending) {
      return;
    }
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
    if (addCourt.isPending) {
      return;
    }
    addCourt.mutate({ venueId: id, name: newCourtName, sport: newCourtSport });
  }

  function onLogoPicked(file: File | null) {
    if (!file) {
      return;
    }
    void entityImageUploadInput(file, locale, "Logo")
      .then((input) => uploadLogo.mutate({ venueId: id, ...input }))
      .catch((error: unknown) => {
        setLogoError(error instanceof Error ? error.message : v.logoReadError);
      });
  }

  if (isNotFoundError(venue.error)) {
    notFound();
  }

  if (venue.isLoading) {
    return (
      <DashboardShell title={v.title} isSubPage>
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  if (venue.error) {
    return (
      <DashboardShell title={v.title} isSubPage>
        <ErrorState
          title={v.errorTitle}
          error={venue.error}
          onRetry={() => {
            void venue.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (!venue.data) {
    return (
      <DashboardShell title={v.title} isSubPage>
        <ErrorState
          title={v.errorTitle}
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
    data.courts.find((court) => court.id === deleteCourtId)?.name ??
    v.courtFallback;

  return (
    <DashboardShell title={v.title} hidePageHeader isSubPage>
      <div className="space-y-6">
        <EntityHomeHeader
          leading={
            <EntityMonogram
              name={venueName}
              image={data.logoImageUrl}
              size="lg"
            />
          }
          title={venueName}
          badges={
            data.isPartner ? (
              <Badge variant="secondary">{v.partner.badge}</Badge>
            ) : undefined
          }
          meta={v.location(data.city, data.country)}
          primaryAction={
            data.archivedAt ? (
              <Button
                type="button"
                onClick={() => unarchive.mutate({ id })}
                pending={unarchive.isPending}
                pendingLabel={v.unarchiving}
              >
                {v.unarchiveAction}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveOpen(true)}
              >
                {v.softArchiveAction}
              </Button>
            )
          }
        />

        {data.archivedAt ? (
          <SoftArchiveBanner
            headingLevel={2}
            heading={v.archivedBanner.heading}
          >
            {v.archivedBanner.body}
          </SoftArchiveBanner>
        ) : null}

        <Section
          title={v.partner.title}
          description={v.partner.description}
          action={
            <Switch
              checked={data.isPartner}
              disabled={
                setPartner.isPending || (!data.isPartner && !!data.archivedAt)
              }
              onCheckedChange={(partner) =>
                setPartner.mutate({ venueId: id, partner })
              }
              aria-label={v.partner.title}
            />
          }
        >
          {data.archivedAt && !data.isPartner ? (
            <p className="text-body text-muted-foreground">
              {v.partner.archivedNote}
            </p>
          ) : null}
        </Section>

        <VenueLinkedGroupsSection venueId={id} venueName={venueName} />

        <Section title={v.details.title} description={v.details.description}>
          <form onSubmit={onSubmit} className="space-y-6">
            <FormErrorSummary
              ref={detailsSummaryRef}
              message={globalFormErrorMessage(updateVenue.error)}
            />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="venue-name">
                  {m.webDashboard.venues.new.name}
                </FieldLabel>
                <Input
                  id="venue-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={255}
                  aria-invalid={
                    fieldErrorMessage(updateVenue.error, "name")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(updateVenue.error, "name")
                      ? "venue-name-error"
                      : undefined
                  }
                />
                <FieldError id="venue-name-error">
                  {fieldErrorMessage(updateVenue.error, "name")}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="venue-city">
                  {m.webDashboard.venues.new.city}
                </FieldLabel>
                <Input
                  id="venue-city"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  required
                  maxLength={255}
                  aria-invalid={
                    fieldErrorMessage(updateVenue.error, "city")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(updateVenue.error, "city")
                      ? "venue-city-error"
                      : undefined
                  }
                />
                <FieldError id="venue-city-error">
                  {fieldErrorMessage(updateVenue.error, "city")}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="venue-country">
                  {m.webDashboard.venues.new.country}
                </FieldLabel>
                <Input
                  id="venue-country"
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  required
                  maxLength={255}
                  aria-invalid={
                    fieldErrorMessage(updateVenue.error, "country")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(updateVenue.error, "country")
                      ? "venue-country-error"
                      : undefined
                  }
                />
                <FieldError id="venue-country-error">
                  {fieldErrorMessage(updateVenue.error, "country")}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="venue-latitude">
                  {m.webDashboard.venues.new.latitude}
                </FieldLabel>
                <Input
                  id="venue-latitude"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  aria-invalid={
                    fieldErrorMessage(updateVenue.error, "latitude")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(updateVenue.error, "latitude")
                      ? "venue-latitude-error"
                      : "venue-latitude-help"
                  }
                />
                <FieldDescription id="venue-latitude-help">
                  {m.webDashboard.venues.new.latitudeHelp}
                </FieldDescription>
                <FieldError id="venue-latitude-error">
                  {fieldErrorMessage(updateVenue.error, "latitude")}
                </FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="venue-longitude">
                  {m.webDashboard.venues.new.longitude}
                </FieldLabel>
                <Input
                  id="venue-longitude"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  aria-invalid={
                    fieldErrorMessage(updateVenue.error, "longitude")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(updateVenue.error, "longitude")
                      ? "venue-longitude-error"
                      : "venue-longitude-help"
                  }
                />
                <FieldDescription id="venue-longitude-help">
                  {m.webDashboard.venues.new.longitudeHelp}
                </FieldDescription>
                <FieldError id="venue-longitude-error">
                  {fieldErrorMessage(updateVenue.error, "longitude")}
                </FieldError>
              </Field>
            </FieldGroup>
            <div className="flex items-center gap-3">
              <Button
                type="submit"
                className="min-h-11"
                disabled={updateVenue.isPending}
              >
                {updateVenue.isPending ? m.common.saving : m.common.save}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/venues">{m.common.cancel}</Link>
              </Button>
            </div>
          </form>
        </Section>

        <Section title={v.logo.title}>
          <EntityImageField
            id="venue-logo"
            label={v.logo.upload}
            noun="Logo"
            currentImageUrl={data.logoImageUrl}
            error={logoError}
            disabled={clearLogo.isPending}
            pending={uploadLogo.isPending}
            onFileChange={onLogoPicked}
            onError={setLogoError}
          />
          {data.logoImageUrl ? (
            <Button
              type="button"
              variant="outline"
              disabled={clearLogo.isPending || uploadLogo.isPending}
              onClick={() => setClearLogoOpen(true)}
            >
              {v.logo.clear}
            </Button>
          ) : null}
        </Section>

        <VenueManagersSection venueId={id} />

        <Section title={v.courts.title} description={v.courts.description}>
          <form onSubmit={onAddCourt} className="space-y-3">
            <FormErrorSummary
              ref={courtSummaryRef}
              message={globalFormErrorMessage(addCourt.error)}
            />
            <Field>
              <FieldLabel htmlFor="new-court-name">
                {v.courts.nameLabel}
              </FieldLabel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <Input
                  id="new-court-name"
                  className="min-w-48 flex-1"
                  value={newCourtName}
                  onChange={(event) => setNewCourtName(event.target.value)}
                  required
                  maxLength={255}
                  aria-invalid={
                    fieldErrorMessage(addCourt.error, "name") ? true : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(addCourt.error, "name")
                      ? "new-court-name-error"
                      : undefined
                  }
                />
                <Select
                  value={newCourtSport}
                  onValueChange={(next) => setNewCourtSport(next as Sport)}
                >
                  <SelectTrigger
                    id="new-court-sport"
                    aria-label={m.team.sportLabel}
                    className="w-full sm:w-40"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {sportLabel(value, locale) ?? value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={addCourt.isPending}>
                  {addCourt.isPending ? v.courts.adding : v.courts.add}
                </Button>
              </div>
              <FieldError id="new-court-name-error">
                {fieldErrorMessage(addCourt.error, "name")}
              </FieldError>
            </Field>
          </form>

          {data.courts.length === 0 ? (
            <p className="text-body text-muted-foreground">{v.courts.empty}</p>
          ) : (
            <RowList>
              {data.courts.map((court) => {
                const draft = courtNames[court.id] ?? court.name;
                const renaming =
                  renameCourt.isPending &&
                  renameCourt.variables?.id === court.id;
                const renameError =
                  renameCourt.error && renameCourt.variables?.id === court.id
                    ? fieldErrorMessage(renameCourt.error, "name")
                    : undefined;
                return (
                  <li
                    key={court.id}
                    className="flex min-h-16 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-end"
                  >
                    <Field className="min-w-0 flex-1">
                      <FieldLabel htmlFor={`court-name-${court.id}`}>
                        {v.courts.nameLabel}
                      </FieldLabel>
                      <Input
                        id={`court-name-${court.id}`}
                        value={draft}
                        onChange={(event) =>
                          setCourtNames((current) => ({
                            ...current,
                            [court.id]: event.target.value,
                          }))
                        }
                        maxLength={255}
                        required
                        aria-invalid={renameError ? true : undefined}
                        aria-describedby={
                          renameError
                            ? `court-name-${court.id}-error`
                            : undefined
                        }
                      />
                      <FieldError id={`court-name-${court.id}-error`}>
                        {renameError}
                      </FieldError>
                    </Field>
                    <Field className="sm:w-40">
                      <FieldLabel htmlFor={`court-sport-${court.id}`}>
                        {m.team.sportLabel}
                      </FieldLabel>
                      <Select
                        value={court.sport}
                        disabled={setCourtSport.isPending}
                        onValueChange={(next) =>
                          setCourtSport.mutate({
                            id: court.id,
                            sport: next as Sport,
                          })
                        }
                      >
                        <SelectTrigger
                          id={`court-sport-${court.id}`}
                          aria-label={v.courts.courtSport(court.name)}
                          className="w-full"
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SPORTS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {sportLabel(value, locale) ?? value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={v.courts.renameCourt(court.name)}
                        disabled={
                          !courtRenameIsDirty(draft, court.name) ||
                          renameCourt.isPending
                        }
                        pending={renaming}
                        pendingLabel={v.courts.renaming}
                        onClick={() =>
                          renameCourt.mutate({ id: court.id, name: draft })
                        }
                      >
                        {v.courts.rename}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        aria-label={v.courts.deleteCourt(court.name)}
                        disabled={deleteCourt.isPending}
                        onClick={() => setDeleteCourtId(court.id)}
                      >
                        {m.common.delete}
                      </Button>
                    </div>
                  </li>
                );
              })}
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
        title={v.deleteCourtConfirm.title(deleteCourtName)}
        description={m.game.consequence.cannotBeUndone}
        confirmLabel={v.deleteCourtConfirm.confirmLabel}
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
        title={v.clearLogoConfirm.title(venueName)}
        description={v.clearLogoConfirm.description}
        confirmLabel={v.logo.clear}
        pending={clearLogo.isPending}
        onConfirm={async () => {
          await clearLogo.mutateAsync({ venueId: id });
        }}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={v.archiveConfirm.title(venueName)}
        description={v.archiveConfirm.description}
        confirmLabel={v.archiveConfirm.confirmLabel}
        pending={softArchive.isPending}
        onConfirm={async () => {
          await softArchive.mutateAsync({ id });
        }}
      />
    </DashboardShell>
  );
}

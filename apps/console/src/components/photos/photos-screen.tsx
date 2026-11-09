"use client";

import { Loader2Icon, Trash2, Upload } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import {
  ConsoleCard,
  ConsoleCardHeader,
} from "~/components/console/console-card";
import { ConsolePage } from "~/components/console/console-page";
import {
  useManagedVenue,
  type ManagedVenue,
} from "~/components/console/managed-venue-context";
import { PageHeader } from "~/components/console/page-header";
import { SegmentedControl } from "~/components/console/segmented-control";
import { inkButtonClass } from "~/components/courts/classes";
import { VenueLogoField } from "~/components/details/venue-logo-field";
import { Button } from "~/components/ui/button";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";
import { useLocale, useMessages } from "~/components/locale-provider";
import { api } from "~/trpc/react";
import { ENTITY_IMAGE_ACCEPT } from "@repo/domain/entity-image-file";
import type { Messages } from "@repo/i18n/messages";
import { VENUE_PHOTO_LIMIT } from "@repo/domain/venue-photos";

import { AppPreview, type AppPreviewScreen } from "./app-preview";
import { photoUploadInput } from "./shrink-photo";

type Photo = ManagedVenue["photos"][number];

const PREVIEW_SCREENS = ["list", "page"] as const;

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function RoleButton({
  active,
  label,
  description,
  disabled,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={description}
      title={description}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-xs h-8 border px-2.5 text-[12px] transition-colors disabled:opacity-50",
        active
          ? "border-ink bg-ink text-paper font-semibold"
          : "border-border hover:bg-wash",
      )}
    >
      {label}
    </button>
  );
}

function PhotoTile({
  photo,
  index,
  isCover,
  isDetail,
  busy,
  onCover,
  onDetail,
  onDelete,
}: {
  photo: Photo;
  index: number;
  isCover: boolean;
  isDetail: boolean;
  busy: boolean;
  onCover: () => void;
  onDetail: () => void;
  onDelete: () => void;
}) {
  const m = useMessages().consoleVenue.photos;
  const n = index + 1;
  return (
    <li className="border-border rounded-block overflow-hidden border">
      <div className="bg-wash relative aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element -- photos load from presigned bucket URLs, not the Next image optimizer */}
        <img
          src={photo.imageUrl}
          alt={m.photoAlt(n)}
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="border-border flex items-center gap-1.5 border-t p-2">
        <RoleButton
          active={isCover}
          label={m.main}
          description={isCover ? m.isMain(n) : m.useAsMain(n)}
          disabled={busy}
          onClick={onCover}
        />
        <RoleButton
          active={isDetail}
          label={m.detailsRole}
          description={isDetail ? m.isDetails(n) : m.useAsDetails(n)}
          disabled={busy}
          onClick={onDetail}
        />
        <Button
          type="button"
          variant="ghost"
          aria-label={m.deletePhotoLabel(n)}
          className="ms-auto size-8 min-h-8 p-0"
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </div>
    </li>
  );
}

function UploadingTile() {
  const m = useMessages().consoleVenue.photos;
  return (
    <li className="border-border rounded-block overflow-hidden border">
      <div className="bg-wash text-muted-foreground text-meta flex aspect-[4/3] items-center justify-center gap-2">
        <Loader2Icon aria-hidden="true" className="size-4 animate-spin" />
        {m.uploading}
      </div>
      <div className="border-border h-[49px] border-t" />
    </li>
  );
}

function previewCaption(
  venue: ManagedVenue,
  screen: AppPreviewScreen,
  m: Messages["consoleVenue"]["photos"],
) {
  if (venue.photos.length === 0) {
    return venue.logoImageUrl ? m.captionLogo : m.captionHatch;
  }
  return screen === "list" ? m.captionList : m.captionPage;
}

export function PhotosScreen() {
  const m = useMessages().consoleVenue.photos;
  const locale = useLocale();
  const venue = useManagedVenue();
  const venueId = venue.id;
  const utils = api.useUtils();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [screen, setScreen] = React.useState<AppPreviewScreen>("list");
  const [uploading, setUploading] = React.useState(0);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState<Photo | null>(null);
  const [now] = React.useState(() => new Date());

  const refresh = () => utils.venues.managedById.invalidate({ venueId });

  const uploadPhoto = api.venues.uploadPhoto.useMutation();
  const deletePhoto = api.venues.deletePhoto.useMutation({
    onSuccess: async () => {
      toast.success(m.deletedToast);
      await refresh();
    },
  });
  const setDisplayPhotos = api.venues.setDisplayPhotos.useMutation({
    onSuccess: refresh,
    onError: (error) => toast.error(error.message),
  });

  const room = VENUE_PHOTO_LIMIT - venue.photos.length - uploading;
  const busy = uploading > 0 || setDisplayPhotos.isPending;

  async function onFilesPicked(files: File[]) {
    if (files.length === 0) {
      return;
    }
    const batch = files.slice(0, Math.max(0, room));
    const problems: string[] =
      files.length > batch.length
        ? [m.leftOut(VENUE_PHOTO_LIMIT, files.length - batch.length)]
        : [];
    setUploadError(null);
    setUploading(batch.length);
    let saved = 0;
    for (const file of batch) {
      try {
        const input = await photoUploadInput(file, locale);
        await uploadPhoto.mutateAsync({ venueId, ...input });
        saved += 1;
      } catch (error) {
        problems.push(
          m.fileProblem(file.name, errorMessage(error, m.couldNotUpload)),
        );
      } finally {
        setUploading((count) => count - 1);
      }
    }
    await refresh();
    if (saved > 0) {
      toast.success(m.uploaded(saved));
    }
    setUploadError(problems.length > 0 ? problems.join(" ") : null);
  }

  function pick(role: "coverPhotoId" | "detailPhotoId", photoId: string) {
    setScreen(role === "coverPhotoId" ? "list" : "page");
    if (venue[role] !== photoId) {
      setDisplayPhotos.mutate({ venueId, [role]: photoId });
    }
  }

  const deletingRole =
    deleting &&
    (deleting.id === venue.coverPhotoId || deleting.id === venue.detailPhotoId);

  return (
    <ConsolePage className="gap-[26px]">
      <PageHeader
        title={m.title}
        description={m.description}
        action={
          <Button
            type="button"
            className={inkButtonClass}
            disabled={room <= 0}
            onClick={() => inputRef.current?.click()}
          >
            <Upload aria-hidden="true" className="size-[15px]" />
            {m.upload}
          </Button>
        }
      />
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ENTITY_IMAGE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void onFilesPicked(files);
        }}
      />
      <div className="grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] items-start gap-[22px]">
        <div className="flex min-w-0 flex-col gap-[22px]">
          <ConsoleCard>
            <ConsoleCardHeader
              title={m.library}
              action={
                <span className="text-meta text-muted-foreground">
                  {m.countOfLimit(venue.photos.length, VENUE_PHOTO_LIMIT)}
                </span>
              }
            />
            <div className="flex flex-col gap-4 px-5 py-5">
              {venue.photos.length === 0 && uploading === 0 ? (
                <div className="rounded-block relative flex min-h-[180px] flex-col items-center justify-center gap-1 px-6 text-center">
                  <Hatch className="rounded-block absolute inset-0" />
                  <p className="bg-paper relative px-2 text-sm font-semibold">
                    {m.emptyTitle}
                  </p>
                  <p className="bg-paper text-meta text-muted-foreground relative max-w-sm px-2">
                    {m.emptyDescription}
                  </p>
                </div>
              ) : (
                <ul
                  aria-label={m.listLabel}
                  className="grid grid-cols-2 gap-3 xl:grid-cols-3"
                >
                  {venue.photos.map((photo, index) => (
                    <PhotoTile
                      key={photo.id}
                      photo={photo}
                      index={index}
                      isCover={photo.id === venue.coverPhotoId}
                      isDetail={photo.id === venue.detailPhotoId}
                      busy={busy}
                      onCover={() => pick("coverPhotoId", photo.id)}
                      onDetail={() => pick("detailPhotoId", photo.id)}
                      onDelete={() => setDeleting(photo)}
                    />
                  ))}
                  {Array.from({ length: uploading }, (_, index) => (
                    <UploadingTile key={`uploading-${index}`} />
                  ))}
                </ul>
              )}
              {uploadError ? (
                <p role="alert" className="text-destructive text-meta">
                  {uploadError}
                </p>
              ) : null}
              <p className="text-muted-foreground text-xs">{m.formats}</p>
            </div>
          </ConsoleCard>

          <ConsoleCard>
            <ConsoleCardHeader title={m.logoCard} />
            <div className="flex flex-col gap-4 px-5 py-5">
              <VenueLogoField
                venueId={venueId}
                logoImageUrl={venue.logoImageUrl ?? null}
              />
              <p className="text-muted-foreground text-xs">{m.logoHelp}</p>
            </div>
          </ConsoleCard>
        </div>

        <ConsoleCard className="sticky top-6 overflow-hidden">
          <ConsoleCardHeader
            title={m.inTheApp}
            action={
              <SegmentedControl
                label={m.previewLabel}
                value={screen}
                options={PREVIEW_SCREENS.map((value) => ({
                  value,
                  label: m.previewScreens[value],
                }))}
                onChange={setScreen}
              />
            }
          />
          <div className="bg-wash flex flex-col gap-3 px-5 py-6">
            <AppPreview venue={venue} screen={screen} now={now} />
            <p className="text-meta text-muted-foreground text-center">
              {previewCaption(venue, screen, m)}
            </p>
          </div>
        </ConsoleCard>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleting(null);
          }
        }}
        title={m.deleteTitle}
        description={deletingRole ? m.deleteInUse : m.deleteUnused}
        confirmLabel={m.deleteConfirm}
        pending={deletePhoto.isPending}
        onConfirm={async () => {
          if (deleting) {
            await deletePhoto.mutateAsync({ venueId, photoId: deleting.id });
          }
        }}
      />
    </ConsolePage>
  );
}

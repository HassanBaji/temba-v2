"use client";

import * as React from "react";

import { SlotText } from "~/components/auth/auth-terms-note";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NotNowLink, TaskActions } from "~/components/onboarding/task-actions";
import { PhotoCropper } from "~/components/profile-photo/photo-cropper";
import { Button, buttonVariants } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Hatch } from "~/components/ui/hatch";
import { INITIAL_CROP, type PhotoCrop } from "~/lib/photo-crop";
import {
  croppedPhotoFile,
  decodePhoto,
  type DecodedPhoto,
} from "~/lib/profile-photo-file";
import { cn } from "~/lib/utils";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { initials } from "@repo/domain/initials";
import { userDisplayName } from "@repo/domain/user-display-name";

const FILE_INPUT_ID = "profile-photo-file";

type PickedPhoto = { url: string; photo: DecodedPhoto; name: string };

export type ProfilePhotoUser = {
  firstName: string | null;
  lastName: string | null;
  hasImage: boolean;
  imageUrl: string;
  setProfileImage: (params: { file: File }) => Promise<unknown>;
  reload: () => Promise<unknown>;
};

/**
 * Picks a profile photo, lets the User frame it, and saves the framed square
 * straight to Clerk. Onboarding passes
 * `notNowHref` for its way out; Settings has only the back button.
 */
export function ProfilePhotoForm({
  user,
  onSaved,
  notNowHref,
}: {
  user: ProfilePhotoUser;
  onSaved: () => void;
  notNowHref?: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webAuth.onboarding.photo;
  const [picked, setPicked] = React.useState<PickedPhoto | null>(null);
  const [crop, setCrop] = React.useState<PhotoCrop>(INITIAL_CROP);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const latestPick = React.useRef(0);

  React.useEffect(() => {
    if (!picked) {
      return;
    }
    const { url } = picked;
    return () => URL.revokeObjectURL(url);
  }, [picked]);

  async function onPick(file: File) {
    const pick = ++latestPick.current;
    setError(null);
    const url = URL.createObjectURL(file);
    const photo = await decodePhoto(url, file);
    if (pick !== latestPick.current) {
      URL.revokeObjectURL(url);
      return;
    }
    if (!photo) {
      URL.revokeObjectURL(url);
      setError(copy.unsupportedType);
      return;
    }
    setCrop(INITIAL_CROP);
    setPicked({ url, photo, name: file.name });
  }

  const name = userDisplayName(user);
  const current = user.hasImage ? user.imageUrl : null;

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !picked) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const upload = await croppedPhotoFile(picked.photo, crop, picked.name);
      if (!upload) {
        setError(copy.cropFailed);
        setPending(false);
        return;
      }
      await user.setProfileImage({ file: upload });
      await user.reload();
      onSaved();
    } catch (err) {
      setError(splitClerkAuthError(err, locale).globalMessage);
      setPending(false);
    }
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={onSave} noValidate>
      <FormErrorSummary message={error} />
      <div className="flex flex-col items-center gap-4 py-2">
        {picked ? (
          <PhotoCropper
            src={picked.url}
            natural={picked.photo.natural}
            crop={crop}
            onCropChange={setCrop}
            disabled={pending}
          />
        ) : current ? (
          // eslint-disable-next-line @next/next/no-img-element -- Clerk image URLs are not static assets
          <img
            src={current}
            alt={copy.currentAlt}
            className="border-rule size-40 rounded-full border object-cover"
          />
        ) : (
          <span className="relative flex size-40 items-center justify-center">
            <Hatch className="border-rule absolute inset-0 rounded-full border" />
            <span className="text-eyebrow text-muted-foreground relative font-mono uppercase">
              {copy.placeholder}
            </span>
          </span>
        )}
        {!picked && !current && name ? (
          <p className="text-meta text-muted-foreground">
            <SlotText
              text={copy.untilThenShownAs}
              slots={{
                initials: (
                  <span className="text-ink font-semibold">
                    {initials(name)}
                  </span>
                ),
              }}
            />
          </p>
        ) : null}
        <input
          id={FILE_INPUT_ID}
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={pending}
          onChange={(event) => {
            const chosen = event.target.files?.[0];
            // Cleared so picking the same file again still fires a change.
            event.target.value = "";
            if (chosen) {
              void onPick(chosen);
            }
          }}
        />
        <label
          htmlFor={FILE_INPUT_ID}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "border-rule bg-paper hover:bg-wash w-full cursor-pointer font-semibold",
            pending && "pointer-events-none opacity-50",
          )}
        >
          {picked ? copy.chooseDifferent : copy.choose}
        </label>
      </div>
      <TaskActions>
        <Button
          type="submit"
          size="lg"
          pending={pending}
          pendingLabel={copy.saving}
          disabled={!picked}
          className="w-full font-semibold"
        >
          {copy.save}
        </Button>
        {notNowHref ? (
          <NotNowLink href={notNowHref} disabled={pending} />
        ) : null}
      </TaskActions>
    </form>
  );
}

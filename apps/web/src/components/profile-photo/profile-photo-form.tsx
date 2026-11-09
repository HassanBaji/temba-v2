"use client";

import * as React from "react";

import { SlotText } from "~/components/auth/auth-terms-note";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NotNowLink, TaskActions } from "~/components/onboarding/task-actions";
import { Button, buttonVariants } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Hatch } from "~/components/ui/hatch";
import { profilePhotoUploadFile } from "~/lib/profile-photo-file";
import { cn } from "~/lib/utils";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { initials } from "@repo/domain/initials";
import { userDisplayName } from "@repo/domain/user-display-name";

const FILE_INPUT_ID = "profile-photo-file";

export type ProfilePhotoUser = {
  firstName: string | null;
  lastName: string | null;
  hasImage: boolean;
  imageUrl: string;
  setProfileImage: (params: { file: File }) => Promise<unknown>;
  reload: () => Promise<unknown>;
};

/**
 * Picks a profile photo and saves it straight to Clerk. Onboarding passes
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
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const name = userDisplayName(user);
  const shown = preview ?? (user.hasImage ? user.imageUrl : null);

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !file) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const upload = await profilePhotoUploadFile(file);
      if (!upload) {
        setError(copy.unsupportedType);
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
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: previews and Clerk image URLs are not static assets
          <img
            src={shown}
            alt={preview ? copy.chosenAlt : copy.currentAlt}
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
        {!shown && name ? (
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
            setError(null);
            setFile(event.target.files?.[0] ?? null);
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
          {file ? copy.chooseDifferent : copy.choose}
        </label>
        {file ? (
          <p
            className="text-meta text-muted-foreground truncate"
            aria-live="polite"
          >
            {file.name}
          </p>
        ) : null}
      </div>
      <TaskActions>
        <Button
          type="submit"
          size="lg"
          pending={pending}
          pendingLabel={copy.saving}
          disabled={!file}
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

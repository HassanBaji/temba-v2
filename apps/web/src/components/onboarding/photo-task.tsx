"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { NotNowLink, TaskActions } from "~/components/onboarding/task-actions";
import { Button, buttonVariants } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { initials } from "@repo/domain/initials";
import { userDisplayName } from "@repo/domain/user-display-name";

const FILE_INPUT_ID = "profile-photo-file";

function Picker({
  user,
  backHref,
}: {
  user: {
    firstName: string | null;
    lastName: string | null;
    hasImage: boolean;
    imageUrl: string;
    setProfileImage: (params: { file: File }) => Promise<unknown>;
    reload: () => Promise<unknown>;
  };
  backHref: string;
}) {
  const router = useRouter();
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
      await user.setProfileImage({ file });
      await user.reload();
      router.replace(backHref);
    } catch (err) {
      setError(splitClerkAuthError(err).globalMessage);
      setPending(false);
    }
  }

  return (
    <AuthScreen
      backHref={backHref}
      backLabel="Back"
      eyebrow="Profile / Photo"
      title="Add a photo"
      description="A clear face shot helps organizers spot you at the court. Shown to Group members and people in your Games."
    >
      <form className="flex flex-col gap-5" onSubmit={onSave} noValidate>
        <FormErrorSummary message={error} />
        <div className="flex flex-col items-center gap-4 py-2">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob: previews and Clerk image URLs are not static assets
            <img
              src={shown}
              alt={preview ? "Your chosen photo" : "Your current profile photo"}
              className="border-rule size-40 rounded-full border object-cover"
            />
          ) : (
            <span className="relative flex size-40 items-center justify-center">
              <Hatch className="border-rule absolute inset-0 rounded-full border" />
              <span className="text-eyebrow text-muted-foreground relative font-mono uppercase">
                Profile photo
              </span>
            </span>
          )}
          {!shown && name ? (
            <p className="text-meta text-muted-foreground">
              Until then you show as{" "}
              <span className="text-ink font-semibold">{initials(name)}</span>.
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
            {file ? "Choose a different photo" : "Choose a photo"}
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
            pendingLabel="Saving photo…"
            disabled={!file}
            className="w-full font-semibold"
          >
            Save photo
          </Button>
          <NotNowLink href={backHref} disabled={pending} />
        </TaskActions>
      </form>
    </AuthScreen>
  );
}

/** The "Add a profile photo" Profile task, saved straight to Clerk. */
export function PhotoTask({ backHref }: { backHref: string }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return (
      <AuthScreen brand>
        <AuthLoading />
      </AuthScreen>
    );
  }

  return <Picker user={user} backHref={backHref} />;
}

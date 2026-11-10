"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { useMessages } from "~/components/locale-provider";
import { ProfilePhotoForm } from "~/components/profile-photo/profile-photo-form";

/** The "Add a profile photo" Profile task, saved straight to Clerk. */
export function PhotoTask({ backHref }: { backHref: string }) {
  const m = useMessages();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return (
      <AuthScreen brand>
        <AuthLoading />
      </AuthScreen>
    );
  }

  const copy = m.webAuth.onboarding.photo;
  return (
    <AuthScreen
      backHref={backHref}
      backLabel={m.common.back}
      eyebrow={m.webAuth.onboarding.eyebrow.photo}
      title={copy.title}
      description={copy.description}
    >
      <ProfilePhotoForm
        user={user}
        onSaved={() => router.replace(backHref)}
        notNowHref={backHref}
      />
    </AuthScreen>
  );
}

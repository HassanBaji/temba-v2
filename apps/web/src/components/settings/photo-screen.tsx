"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { useMessages } from "~/components/locale-provider";
import { ProfilePhotoForm } from "~/components/profile-photo/profile-photo-form";
import { SettingsScreen } from "~/components/settings/settings-screen";
import { Skeleton } from "~/components/ui/skeleton";

/** Adding or changing the profile photo from Settings, outside onboarding. */
export function PhotoScreen({ backHref }: { backHref: string }) {
  const m = useMessages();
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const copy = m.webAuth.onboarding.photo;
  const title = user?.hasImage ? m.you.details.changePhoto : copy.title;

  return (
    <SettingsScreen title={title} backHref={backHref}>
      <p className="text-body text-muted-foreground mb-5 leading-[1.5]">
        {copy.description}
      </p>
      {isLoaded && user ? (
        <ProfilePhotoForm
          user={user}
          onSaved={() => router.replace(backHref)}
        />
      ) : (
        <div aria-busy="true" className="flex flex-col items-center gap-4">
          <Skeleton className="size-40 rounded-full" />
          <Skeleton className="h-13 w-full" />
        </div>
      )}
    </SettingsScreen>
  );
}

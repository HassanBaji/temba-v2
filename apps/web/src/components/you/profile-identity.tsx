"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Camera } from "lucide-react";

import { UserAvatar } from "~/components/common/user-avatar";
import { AvatarBadge } from "~/components/ui/avatar";
import { Skeleton } from "~/components/ui/skeleton";
import { playingSinceLine } from "@repo/domain/profile-all-time";
import { preferredPositionProfileLine } from "@repo/domain/preferred-position";
import { api } from "~/trpc/react";

const avatarClassName =
  "border-rule size-[72px] rounded-card border text-[22px] font-semibold data-[size=default]:size-[72px] data-[size=default]:rounded-card [&_[data-slot=avatar-fallback]]:rounded-card [&_[data-slot=avatar-fallback]]:text-[22px] [&_[data-slot=avatar-fallback]]:font-semibold";

function ProfileIdentityAvatar({
  displayName,
  hasImage,
  imageUrl,
}: {
  displayName: string;
  hasImage: boolean;
  imageUrl: string;
}) {
  const clerk = useClerk();
  const { user } = useUser();
  const photoLabel = hasImage ? "Edit profile photo" : "Add profile photo";

  return (
    <button
      type="button"
      aria-label={photoLabel}
      className="focus-visible:ring-ring/50 rounded-card relative size-[72px] shrink-0 outline-none focus-visible:ring-[3px]"
      onClick={() => {
        clerk.openUserProfile();
        void user?.reload();
      }}
    >
      <UserAvatar
        name={displayName}
        image={hasImage ? imageUrl : null}
        className={avatarClassName}
      />
      <AvatarBadge aria-hidden="true" className="size-3 [&>svg]:size-2">
        <Camera />
      </AvatarBadge>
    </button>
  );
}

export function ProfileIdentity({
  displayName,
  hasImage,
  imageUrl,
  canEditPhoto,
  ready,
}: {
  displayName: string;
  hasImage: boolean;
  imageUrl: string | null;
  canEditPhoto: boolean;
  ready: boolean;
}) {
  const state = api.users.onboardingState.useQuery(undefined, {
    enabled: ready,
  });
  const stats = api.users.profileStats.useQuery(undefined, {
    enabled: ready,
  });
  const positionLine = preferredPositionProfileLine(
    state.data?.preferredPosition,
  );
  const playingSince = playingSinceLine(stats.data?.firstMatchAt ?? null);

  if (!ready) {
    return (
      <div className="flex items-center gap-4">
        <Skeleton className="rounded-card size-[72px] shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-[22px] w-40 max-w-full" />
          <Skeleton className="h-3.5 w-24 max-w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {canEditPhoto && imageUrl != null ? (
        <ProfileIdentityAvatar
          displayName={displayName}
          hasImage={hasImage}
          imageUrl={imageUrl}
        />
      ) : (
        <UserAvatar name={displayName} className={avatarClassName} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-ink truncate text-[22px] font-bold tracking-[-0.01em]">
          {displayName}
        </p>
        {positionLine ? (
          <p className="text-meta text-muted-foreground mt-1 truncate">
            {positionLine}
          </p>
        ) : null}
        {playingSince ? (
          <p
            className={
              positionLine
                ? "text-meta text-muted-foreground truncate"
                : "text-meta text-muted-foreground mt-1 truncate"
            }
          >
            {playingSince}
          </p>
        ) : null}
      </div>
    </div>
  );
}

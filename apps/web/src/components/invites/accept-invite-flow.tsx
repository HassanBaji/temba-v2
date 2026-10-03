"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { InviteAuthButtons } from "~/components/invites/invite-auth-buttons";
import {
  InviteOutcome,
  InvitePreviewError,
} from "~/components/invites/invite-outcome";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import type { InviteHostKind } from "~/server/invites/doors";

export function AcceptInviteFlow({
  kind,
  token,
  isSignedIn,
  returnPath,
}: {
  kind: Exclude<InviteHostKind, "game">;
  token: string;
  isSignedIn: boolean;
  returnPath: string;
}) {
  const router = useRouter();

  const communityPreview = api.communities.previewInviteLink.useQuery(
    { token },
    { enabled: kind === "community" },
  );
  const groupPreview = api.groups.previewInviteLink.useQuery(
    { token },
    { enabled: kind === "group" },
  );
  const teamPreview = api.teams.previewInviteLink.useQuery(
    { token },
    { enabled: kind === "team" },
  );

  const communityAccept = api.communities.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      toast.success("Joined Community");
      router.replace(`/dashboard/communities/${result.communityId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const groupAccept = api.groups.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      toast.success("Joined Group");
      router.replace(`/dashboard/groups/${result.groupId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const teamAccept = api.teams.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      toast.success("Joined Team");
      router.replace(`/dashboard/teams/${result.teamId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const preview =
    kind === "community"
      ? communityPreview
      : kind === "group"
        ? groupPreview
        : teamPreview;
  const accept =
    kind === "community"
      ? communityAccept
      : kind === "group"
        ? groupAccept
        : teamAccept;

  const entityLabel =
    kind === "community" ? "Community" : kind === "group" ? "Group" : "Team";
  const readyPreview =
    preview.data?.status === "ready" ? preview.data : undefined;
  const entityName = readyPreview
    ? "communityName" in readyPreview
      ? readyPreview.communityName
      : "groupName" in readyPreview
        ? (readyPreview.groupName ?? "Group")
        : readyPreview.teamName
    : entityLabel;

  React.useEffect(() => {
    if (!isSignedIn) {
      return;
    }
    if (preview.data?.status !== "ready") {
      return;
    }
    if (accept.isPending || accept.isSuccess || accept.isError) {
      return;
    }
    accept.mutate({ token });
  }, [accept, isSignedIn, preview.data?.status, token]);

  if (preview.isLoading || (preview.isError && preview.isFetching)) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (preview.isError) {
    return <InvitePreviewError onRetry={() => void preview.refetch()} />;
  }

  if (
    preview.data?.status === "invalid" ||
    preview.data?.status === "unavailable"
  ) {
    return (
      <InviteOutcome
        outcome={preview.data.status}
        hostLabel={entityLabel}
        isSignedIn={isSignedIn}
      />
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <EntityMonogram name={entityName} size="lg" />
          <div className="min-w-0 space-y-1">
            <h1 className="text-title font-semibold">Join {entityName}</h1>
            <p className="text-meta text-muted-foreground">{entityLabel}</p>
            <p className="text-body text-muted-foreground">
              Sign in or create an account to join {entityName}.
            </p>
          </div>
        </div>
        <InviteAuthButtons
          returnPath={returnPath}
          fullWidth
          className="flex flex-col gap-2 sm:flex-row"
        />
      </div>
    );
  }

  if (accept.isError) {
    return (
      <ErrorState
        title="Could not join"
        message={accept.error.message}
        headingLevel={1}
        onRetry={() => accept.mutate({ token })}
      />
    );
  }

  return (
    <div aria-busy="true" className="flex items-center gap-3">
      <EntityMonogram name={entityName} size="lg" />
      <h1 className="text-title min-w-0 font-semibold">
        Joining {entityName}…
      </h1>
    </div>
  );
}

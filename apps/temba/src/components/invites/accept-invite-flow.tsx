"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { CircleAlert, Inbox } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { EntityMonogram } from "~/components/common/entity-monogram";
import { ErrorState } from "~/components/common/error-state";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

type InviteKind = "community" | "group" | "team";

export function AcceptInviteFlow({
  kind,
  token,
  isSignedIn,
  returnPath,
}: {
  kind: InviteKind;
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
      toast.success("Joined Community as Member");
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

  if (preview.isLoading) {
    return (
      <div aria-busy="true" className="space-y-3">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-6 w-48 max-w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (preview.data?.status === "invalid") {
    return (
      <EmptyState
        icon={Inbox}
        title="Invite unavailable"
        description="This Invite link is invalid or expired."
        action={
          <Button asChild>
            <Link href="/login">Go to login</Link>
          </Button>
        }
      />
    );
  }

  if (preview.data?.status === "unavailable") {
    return (
      <EmptyState
        icon={CircleAlert}
        title="Invite unavailable"
        description={`This ${entityLabel} cannot accept Invite links right now.`}
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Home</Link>
          </Button>
        }
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
              Sign in or sign up with Clerk to join. Opening this URL does not
              log anyone in without Clerk.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <SignInButton mode="redirect" forceRedirectUrl={returnPath}>
            <Button className="min-h-11 w-full sm:w-auto">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="redirect" forceRedirectUrl={returnPath}>
            <Button variant="outline" className="min-h-11 w-full sm:w-auto">
              Sign up
            </Button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  if (accept.isError) {
    return (
      <ErrorState
        title="Could not join"
        message={accept.error.message}
        onRetry={() => accept.mutate({ token })}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <EntityMonogram name={entityName} size="lg" />
        <div className="min-w-0 space-y-1">
          <h1 className="text-title font-semibold">Joining {entityName}…</h1>
          <p className="text-body text-muted-foreground">
            Accepting the Invite link as the signed-in User.
          </p>
        </div>
      </div>
    </div>
  );
}

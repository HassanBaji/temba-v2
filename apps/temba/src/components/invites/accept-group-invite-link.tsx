"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export function AcceptGroupInviteLink({
  token,
  isSignedIn,
  returnPath,
}: {
  token: string;
  isSignedIn: boolean;
  returnPath: string;
}) {
  const router = useRouter();
  const preview = api.groups.previewInviteLink.useQuery({ token });
  const accept = api.groups.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      toast.success("Joined Group");
      router.replace(`/dashboard/groups/${result.groupId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

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
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  if (preview.data?.status === "invalid") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-white">Invite unavailable</h1>
        <p className="text-sm text-white/70">
          This Invite link is invalid or expired.
        </p>
        <Button variant="outline" asChild>
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    );
  }

  if (preview.data?.status === "unavailable") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-white">Invite unavailable</h1>
        <p className="text-sm text-white/70">
          This Group cannot accept Invite links right now.
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-white">
            Join {preview.data?.groupName ?? "Group"}
          </h1>
          <p className="text-sm text-white/70">
            Sign in or sign up with Clerk to become a member. Opening this URL
            does not log anyone in without Clerk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SignInButton mode="redirect" forceRedirectUrl={returnPath}>
            <Button>Sign in</Button>
          </SignInButton>
          <SignUpButton mode="redirect" forceRedirectUrl={returnPath}>
            <Button variant="outline">Sign up</Button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  if (accept.isError) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-white">Could not join</h1>
        <p className="text-sm text-white/70">{accept.error.message}</p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold text-white">
        Joining {preview.data?.groupName ?? "Group"}…
      </h1>
      <p className="text-sm text-white/70">
        Accepting the Invite link as the signed-in User.
      </p>
    </div>
  );
}

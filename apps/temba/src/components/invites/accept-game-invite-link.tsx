"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { toast } from "sonner";

import {
  InviteSeatPicker,
  parseSeatKey,
} from "~/components/games/invite-seat-picker";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export function AcceptGameInviteLink({
  token,
  isSignedIn,
  returnPath,
}: {
  token: string;
  isSignedIn: boolean;
  returnPath: string;
}) {
  const router = useRouter();
  const [seatValue, setSeatValue] = React.useState("");
  const preview = api.games.previewInviteLink.useQuery({ token });
  const accept = api.games.acceptInviteLink.useMutation({
    onSuccess: (result) => {
      if (result.outcome === "waiting_for_partner") {
        toast.success("Waiting for your Team partner to accept");
        return;
      }
      if (result.outcome === "waitlisted") {
        toast.success("Joined Game waitlist");
      } else if (result.outcome === "already") {
        toast.success("Already on this Game");
      } else {
        toast.success("Joined Game");
      }
      router.replace(`/dashboard/games/${result.gameId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const needsSeatPick =
    preview.data?.status === "ready" && preview.data.needsSeatPick;
  const vacantSeats =
    preview.data?.status === "ready" ? preview.data.vacantSeats : [];
  const waitlistOnly = needsSeatPick && vacantSeats.length === 0;

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
    if (preview.data.needsSeatPick && preview.data.vacantSeats.length > 0) {
      return;
    }
    accept.mutate({ token });
  }, [accept, isSignedIn, preview.data, token]);

  function onJoin() {
    if (accept.isPending) {
      return;
    }
    if (needsSeatPick && vacantSeats.length > 0) {
      const seat = parseSeatKey(seatValue);
      if (!seat) {
        toast.error("Pick a vacant Position");
        return;
      }
      accept.mutate({
        token,
        sideIndex: seat.sideIndex,
        position: seat.position,
      });
      return;
    }
    accept.mutate({ token });
  }

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
        <h1 className="text-title font-semibold">Invite unavailable</h1>
        <p className="text-body text-muted-foreground">
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
        <h1 className="text-title font-semibold">Invite unavailable</h1>
        <p className="text-body text-muted-foreground">
          This Game cannot accept Invite links right now.
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            Join {preview.data?.gameName ?? "Game"}
          </h1>
          <p className="text-body text-muted-foreground">
            Sign in or sign up with Clerk to join. Opening this URL does not log
            anyone in without Clerk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SignInButton mode="redirect" forceRedirectUrl={returnPath}>
            <Button className="min-h-11">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="redirect" forceRedirectUrl={returnPath}>
            <Button variant="outline" className="min-h-11">
              Sign up
            </Button>
          </SignUpButton>
        </div>
      </div>
    );
  }

  if (accept.data?.outcome === "waiting_for_partner") {
    return (
      <div className="space-y-3">
        <h1 className="text-title font-semibold">Waiting for your partner</h1>
        <p className="text-body text-muted-foreground">
          This Team-only Game registers the Team only after both partners
          accept. Pending does not occupy a seat or the waitlist.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (accept.isError) {
    return (
      <div className="space-y-3">
        <h1 className="text-title font-semibold">Could not join</h1>
        <p className="text-body text-muted-foreground">
          {accept.error.message}
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (needsSeatPick && vacantSeats.length > 0 && !accept.isSuccess) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-title font-semibold">
            Join{" "}
            {preview.data?.status === "ready" ? preview.data.gameName : "Game"}
          </h1>
          <p className="text-body text-muted-foreground">
            Pick a vacant Position to sit, or this accept will be refused if
            that seat is taken.
          </p>
        </div>
        <InviteSeatPicker
          vacantSeats={vacantSeats}
          value={seatValue}
          onChange={setSeatValue}
        />
        <Button onClick={onJoin} disabled={accept.isPending}>
          {accept.isPending ? "Joining…" : "Accept"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-title font-semibold">
        Joining {preview.data?.gameName ?? "Game"}…
      </h1>
      <p className="text-body text-muted-foreground">
        {waitlistOnly
          ? "No vacant Position. Joining the waitlist."
          : "Accepting the Invite link as the signed-in User."}
      </p>
    </div>
  );
}

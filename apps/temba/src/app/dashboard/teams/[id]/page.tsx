"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";

export default function TeamHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = api.useUtils();
  const team = api.teams.byId.useQuery({ id });

  const inviteInApp = api.teams.inviteInApp.useMutation({
    onSuccess: async () => {
      toast.success("Invite sent");
      await utils.teams.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const sendEmailInvite = api.teams.sendEmailInvite.useMutation({
    onSuccess: async (result) => {
      toast.success(`Email invite ready for ${result.email}`);
      await utils.teams.byId.invalidate({ id });
      await navigator.clipboard.writeText(result.inviteUrl);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeInvite = api.teams.revokeInAppInvite.useMutation({
    onSuccess: async () => {
      toast.success("Invite revoked");
      await utils.teams.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeEmailInvite = api.teams.revokeEmailInvite.useMutation({
    onSuccess: async () => {
      toast.success("Email invite revoked");
      await utils.teams.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const acceptInvite = api.teams.acceptInAppInvite.useMutation({
    onSuccess: async () => {
      toast.success("Joined Team");
      await utils.teams.byId.invalidate({ id });
      await utils.teams.mine.invalidate();
      await utils.teams.pendingInvites.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const dissolve = api.teams.dissolve.useMutation({
    onSuccess: async () => {
      toast.success("Team dissolved");
      await utils.teams.mine.invalidate();
      await utils.teams.pendingInvites.invalidate();
      router.push("/dashboard/teams");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const communities = api.communities.mine.useQuery(undefined, {
    enabled: Boolean(team.data?.canRequestLink),
  });

  const requestLink = api.teams.requestLink.useMutation({
    onSuccess: async () => {
      toast.success("Link request sent");
      await utils.teams.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const unlink = api.teams.unlink.useMutation({
    onSuccess: async (result) => {
      toast.success("Team unlinked");
      await utils.teams.byId.invalidate({ id });
      await utils.teams.mine.invalidate();
      if (result.communityId) {
        await utils.communities.byId.invalidate({ id: result.communityId });
        await utils.communities.mine.invalidate();
      }
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <DashboardShell title={team.data?.displayName ?? "Team"}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {team.isLoading ? (
              <>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
              </>
            ) : null}

            {team.error ? (
              <p className="text-destructive text-sm">{team.error.message}</p>
            ) : null}

            {team.data ? (
              <>
                <h2 className="text-foreground text-2xl font-semibold tracking-tight">
                  {team.data.displayName}
                </h2>
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  <span className="capitalize">{team.data.sport}</span>
                  {team.data.isLoose ? (
                    <span>· Unattached</span>
                  ) : (
                    <span>· Club Team</span>
                  )}
                  {team.data.membership ? (
                    <span>· You are a member</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {team.data.sport}
                  </Badge>
                  {team.data.isLoose ? (
                    <Badge variant="outline">Loose Team</Badge>
                  ) : (
                    <Badge variant="outline">Club Team</Badge>
                  )}
                  {team.data.waitingForPartner ? (
                    <Badge variant="outline">Waiting for partner</Badge>
                  ) : null}
                </div>
                {team.data.community ? (
                  <p className="text-muted-foreground text-sm">
                    Linked to{" "}
                    <Link
                      href={`/dashboard/communities/${team.data.community.id}`}
                      className="hover:text-foreground underline underline-offset-2"
                    >
                      {team.data.community.name}
                    </Link>
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    This Team is not linked to a Community.
                  </p>
                )}
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {team.data?.canAccept && team.data.pendingInvite ? (
              <Button
                onClick={() =>
                  acceptInvite.mutate({
                    inviteId: team.data.pendingInvite!.id,
                  })
                }
                disabled={acceptInvite.isPending}
              >
                {acceptInvite.isPending ? "Accepting…" : "Accept invite"}
              </Button>
            ) : null}
            {team.data?.canUnlink ? (
              <Button
                variant="outline"
                onClick={() => unlink.mutate({ teamId: id })}
                disabled={unlink.isPending}
              >
                {unlink.isPending ? "Unlinking…" : "Unlink Team"}
              </Button>
            ) : null}
            {team.data?.canDissolve ? (
              <Button
                variant="outline"
                onClick={() => dissolve.mutate({ teamId: id })}
                disabled={dissolve.isPending}
              >
                {dissolve.isPending ? "Dissolving…" : "Dissolve Team"}
              </Button>
            ) : null}
            {team.data ? (
              <Button variant="outline" asChild>
                <Link href="/dashboard/teams">My Teams</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {team.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Members
            </h3>
            <ul className="divide-border border-border bg-card divide-y rounded-xl border">
              {team.data.members.map((member) => (
                <li
                  key={member.id}
                  className="flex flex-col gap-1 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-foreground font-medium">
                    {member.name}
                    {member.isViewer ? (
                      <span className="text-muted-foreground ml-2 text-sm font-normal">
                        (you)
                      </span>
                    ) : null}
                  </p>
                  {member.isCreator ? (
                    <Badge variant="outline">Creator</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
            {team.data.waitingForPartner ? (
              <p className="text-muted-foreground text-sm">
                Waiting for a partner. This Team is incomplete until a second
                member joins.
              </p>
            ) : null}
          </section>
        ) : null}

        {team.data ? (
          <section className="space-y-3">
            <h3 className="text-foreground text-lg font-semibold tracking-tight">
              Team stats
            </h3>
            <p className="text-muted-foreground text-sm">
              Stored partnership counters. They start at zero until Games
              complete.
            </p>
            <dl className="border-border bg-card grid grid-cols-1 divide-y rounded-xl border md:grid-cols-3 md:divide-x md:divide-y-0">
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Games played</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {team.data.gamesPlayed}
                </dd>
              </div>
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Wins</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {team.data.wins}
                </dd>
              </div>
              <div className="space-y-1 px-4 py-4">
                <dt className="text-muted-foreground text-sm">Losses</dt>
                <dd className="text-foreground text-2xl font-semibold tabular-nums tracking-tight">
                  {team.data.losses}
                </dd>
              </div>
            </dl>
            {team.data.waitingForPartner ? (
              <p className="text-muted-foreground text-sm">
                Waiting for a partner — stats stay at zero until the Team is
                full and Games are completed.
              </p>
            ) : null}
          </section>
        ) : null}

        {team.data?.canRequestLink || team.data?.pendingLinkRequest ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Community link
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Full Teams can request a link to a Community. Owner or Admin
                approve; missing members are auto-admitted.
              </p>
            </div>

            {team.data.pendingLinkRequest ? (
              <p className="text-muted-foreground text-sm">
                Pending request to{" "}
                <span className="text-foreground font-medium">
                  {team.data.pendingLinkRequest.community.name}
                </span>
                .
              </p>
            ) : null}

            {team.data.canRequestLink ? (
              <form
                className="flex flex-col gap-3 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  const communityIdValue = formData.get("communityId");
                  if (
                    typeof communityIdValue !== "string" ||
                    !communityIdValue
                  ) {
                    return;
                  }
                  requestLink.mutate({
                    teamId: id,
                    communityId: communityIdValue,
                  });
                }}
              >
                <select
                  name="communityId"
                  required
                  className="border-input bg-background text-foreground h-9 flex-1 rounded-md border px-3 text-sm"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a Community
                  </option>
                  {communities.data
                    ?.filter((community) => !community.archivedAt)
                    .map((community) => (
                      <option key={community.id} value={community.id}>
                        {community.name}
                      </option>
                    ))}
                </select>
                <Button type="submit" disabled={requestLink.isPending}>
                  {requestLink.isPending ? "Requesting…" : "Request link"}
                </Button>
              </form>
            ) : null}
          </section>
        ) : null}

        {team.data?.canInvite ? (
          <section className="border-border bg-card space-y-6 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Partner invite
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                One unused open-seat invite at a time (in-app or Email). Revoke
                it before sending another. There is no Team Invite link.
              </p>
            </div>

            {team.data.unusedInvite ? (
              <div className="divide-border border-border divide-y rounded-lg border">
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-foreground font-medium">
                      {team.data.unusedInvite.user.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      In-app · {team.data.unusedInvite.user.email}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      revokeInvite.mutate({
                        inviteId: team.data.unusedInvite!.id,
                      })
                    }
                    disabled={revokeInvite.isPending}
                  >
                    {revokeInvite.isPending ? "Revoking…" : "Revoke"}
                  </Button>
                </div>
              </div>
            ) : null}

            {team.data.unusedEmailInvite ? (
              <div className="divide-border border-border divide-y rounded-lg border">
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-foreground font-medium">
                      {team.data.unusedEmailInvite.email}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      Email invite
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          team.data.unusedEmailInvite!.inviteUrl,
                        );
                        toast.success("Invite URL copied");
                      }}
                    >
                      Copy URL
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        revokeEmailInvite.mutate({
                          inviteId: team.data.unusedEmailInvite!.id,
                        })
                      }
                      disabled={revokeEmailInvite.isPending}
                    >
                      {revokeEmailInvite.isPending ? "Revoking…" : "Revoke"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {!team.data.unusedInvite && !team.data.unusedEmailInvite ? (
              <div className="space-y-6">
                <div className="border-border space-y-3 rounded-lg border p-4">
                  <h4 className="text-foreground font-medium">
                    In-app invite (existing User)
                  </h4>
                  <form
                    className="flex flex-col gap-3 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      const emailValue = formData.get("email");
                      if (typeof emailValue !== "string") {
                        return;
                      }
                      const email = emailValue.trim();
                      if (!email) {
                        return;
                      }
                      inviteInApp.mutate({ teamId: id, email });
                      event.currentTarget.reset();
                    }}
                  >
                    <Input
                      name="email"
                      type="email"
                      required
                      placeholder="existing-user@email.com"
                      className="flex-1"
                    />
                    <Button type="submit" disabled={inviteInApp.isPending}>
                      {inviteInApp.isPending ? "Inviting…" : "Invite User"}
                    </Button>
                  </form>
                </div>

                <div className="border-border space-y-3 rounded-lg border p-4">
                  <h4 className="text-foreground font-medium">Email invite</h4>
                  <p className="text-muted-foreground text-sm">
                    Any address is OK. They join after Clerk sign-in if their
                    email matches. This does not add Community membership.
                  </p>
                  <form
                    className="flex flex-col gap-3 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      const emailValue = formData.get("email");
                      if (typeof emailValue !== "string") {
                        return;
                      }
                      const email = emailValue.trim();
                      if (!email) {
                        return;
                      }
                      sendEmailInvite.mutate({ teamId: id, email });
                      event.currentTarget.reset();
                    }}
                  >
                    <Input
                      name="email"
                      type="email"
                      required
                      placeholder="invitee@email.com"
                      className="flex-1"
                    />
                    <Button type="submit" disabled={sendEmailInvite.isPending}>
                      {sendEmailInvite.isPending
                        ? "Sending…"
                        : "Send Email invite"}
                    </Button>
                  </form>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}

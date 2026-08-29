"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use } from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { SPORT_LABELS, SportBadge } from "~/components/temba/sport-badge";
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

  const inviteLink = api.teams.getInviteLink.useQuery(
    { teamId: id },
    { enabled: Boolean(team.data?.canInvite) },
  );

  const inviteInApp = api.teams.inviteInApp.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite sent");
      await utils.teams.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const revokeInvite = api.teams.revokeInAppInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite revoked");
      await utils.teams.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createInviteLink = api.teams.createInviteLink.useMutation({
    onSuccess: async (result) => {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link copied");
      await utils.teams.getInviteLink.invalidate({ teamId: id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const dissolve = api.teams.dissolve.useMutation({
    onSuccess: async () => {
      toast.success("Team dissolved");
      await utils.teams.mine.invalidate();
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
                <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  <span>
                    {team.data.sport in SPORT_LABELS
                      ? SPORT_LABELS[
                          team.data.sport as keyof typeof SPORT_LABELS
                        ]
                      : team.data.sport}
                  </span>
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
                  <SportBadge sport={team.data.sport} />
                  {team.data.isLoose ? (
                    <Badge variant="outline">Unattached</Badge>
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
                Lookup invite
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Look up an existing User by username, email, or phone. The
                invitee accepts on Invites. Lookup invites do not expire. A
                pending Lookup invite and live Invite links may coexist.
              </p>
            </div>

            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const queryValue = formData.get("query");
                if (typeof queryValue !== "string") {
                  return;
                }
                const query = queryValue.trim();
                if (!query) {
                  return;
                }
                inviteInApp.mutate({ teamId: id, query });
                event.currentTarget.reset();
              }}
            >
              <Input
                name="query"
                type="text"
                required
                placeholder="Username, email, or phone"
                className="flex-1"
              />
              <Button type="submit" disabled={inviteInApp.isPending}>
                {inviteInApp.isPending ? "Sending…" : "Send Lookup invite"}
              </Button>
            </form>

            {team.data.unusedInvite ? (
              <div className="divide-border border-border divide-y rounded-lg border">
                <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-foreground font-medium">
                      {team.data.unusedInvite.user.name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {team.data.unusedInvite.user.email}
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
            ) : (
              <p className="text-muted-foreground text-sm">
                No unused Lookup invites.
              </p>
            )}
          </section>
        ) : null}

        {team.data?.canInvite ? (
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
            <div>
              <h3 className="text-foreground text-lg font-medium">
                Invite link
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                Each copy mints a new 6-hour token. Older copied URLs stay live
                until each expires. There is no rotate or revoke. The first
                successful accept fills the seat and kills leftover Team doors.
              </p>
            </div>
            {inviteLink.data ? (
              <p className="text-muted-foreground break-all text-sm">
                Newest: {inviteLink.data.inviteUrl}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                No live Invite link. Copy to mint one.
              </p>
            )}
            <Button
              size="sm"
              onClick={() => createInviteLink.mutate({ teamId: id })}
              disabled={createInviteLink.isPending}
            >
              {createInviteLink.isPending ? "Copying…" : "Copy Invite link"}
            </Button>
          </section>
        ) : null}
      </div>
    </DashboardShell>
  );
}

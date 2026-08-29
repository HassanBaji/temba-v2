"use client";

import { Lock, Users } from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useRef, useState } from "react";
import { toast } from "sonner";

import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
import { AvatarStack } from "~/components/common/avatar-stack";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { StatStrip } from "~/components/common/stat-strip";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { InviteLinkPanel } from "~/components/invites/invite-link-panel";
import { LookupInvitePanel } from "~/components/invites/lookup-invite-panel";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { isNotFoundError } from "~/lib/is-not-found-error";
import {
  fieldErrorMessage,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";

function isForbiddenError(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) {
    return false;
  }
  const data = error.data;
  if (!data || typeof data !== "object" || !("code" in data)) {
    return false;
  }
  return data.code === "FORBIDDEN";
}

function winRate(gamesPlayed: number, wins: number) {
  if (gamesPlayed === 0) {
    return "—";
  }
  return `${Math.round((wins / gamesPlayed) * 100)}%`;
}

export default function TeamHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const utils = api.useUtils();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [dissolveOpen, setDissolveOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

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
      toastGlobalFormError(error);
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
  });

  const communities = api.communities.mine.useQuery(undefined, {
    enabled: Boolean(team.data?.canRequestLink),
  });

  const requestLink = api.teams.requestLink.useMutation({
    onSuccess: async () => {
      toast.success("Link request sent");
      await utils.teams.byId.invalidate({ id });
      setLinkOpen(false);
    },
    onError: (error) => {
      toastGlobalFormError(error);
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
  });

  if (isNotFoundError(team.error)) {
    notFound();
  }

  if (team.isLoading) {
    return (
      <DashboardShell title="Team" hidePageHeader>
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  if (isForbiddenError(team.error)) {
    return (
      <DashboardShell title="Team" hidePageHeader>
        <EmptyState
          icon={Lock}
          title="You cannot open this Team"
          description="Only Team members, members of a linked Community, or a pending invitee can open a Team home."
          action={
            <Button asChild>
              <Link href="/dashboard/teams">Back to Teams</Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  if (team.error) {
    return (
      <DashboardShell title="Team" hidePageHeader>
        <ErrorState
          title="Team could not be loaded"
          message={team.error.message}
          onRetry={() => {
            void team.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  if (!team.data) {
    return (
      <DashboardShell title="Team" hidePageHeader>
        <ErrorState
          title="Team could not be loaded"
          onRetry={() => {
            void team.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const data = team.data;
  const displayName = data.displayName ?? "Team";
  const people = data.members.map((member) => ({
    name: member.name ?? "Member",
  }));

  return (
    <DashboardShell title={displayName} hidePageHeader>
      <div className="space-y-6">
        {data.waitingForPartner && data.canInvite ? (
          <Button
            className="min-h-11 w-full sm:w-auto"
            onClick={() => setInviteOpen(true)}
          >
            Invite your partner
          </Button>
        ) : null}

        <header className="flex items-start gap-3">
          <AvatarStack
            people={people}
            openSeats={data.waitingForPartner ? 1 : 0}
            size="lg"
          />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-h2 lg:text-h1 font-bold tracking-[-0.02em]">
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <SportBadge sport={data.sport} />
              {data.isLoose ? (
                <Badge variant="outline">Not linked to a Community</Badge>
              ) : (
                <Badge variant="outline">Club Team</Badge>
              )}
              {data.waitingForPartner ? (
                <Badge variant="outline">Incomplete</Badge>
              ) : null}
            </div>
            {data.community ? (
              <p className="text-meta text-muted-foreground">
                Linked to{" "}
                <Link
                  href={`/dashboard/communities/${data.community.id}`}
                  className="text-foreground underline underline-offset-2"
                >
                  {data.community.name}
                </Link>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-nowrap items-center gap-1">
            <ActionMenu triggerRef={menuTriggerRef} label="Team actions">
              <ActionMenuItem asChild>
                <Link href="/dashboard/teams">All Teams</Link>
              </ActionMenuItem>
              {data.canInvite ? (
                <ActionMenuItem onSelect={() => setInviteOpen(true)}>
                  Invite partner
                </ActionMenuItem>
              ) : null}
              {data.canRequestLink ? (
                <ActionMenuItem onSelect={() => setLinkOpen(true)}>
                  Request Community link
                </ActionMenuItem>
              ) : null}
              {data.canUnlink || data.canDissolve ? (
                <ActionMenuSeparator />
              ) : null}
              {data.canUnlink ? (
                <ActionMenuItem
                  variant="destructive"
                  onSelect={() => setUnlinkOpen(true)}
                >
                  Unlink from Community
                </ActionMenuItem>
              ) : null}
              {data.canDissolve ? (
                <ActionMenuItem
                  variant="destructive"
                  onSelect={() => setDissolveOpen(true)}
                >
                  Dissolve Team
                </ActionMenuItem>
              ) : null}
            </ActionMenu>
          </div>
        </header>

        {data.waitingForPartner && !data.canInvite ? (
          <p className="text-body text-muted-foreground">
            Waiting for a partner. This Team is incomplete until a second member
            joins.
          </p>
        ) : null}

        {data.pendingLinkRequest ? (
          <p className="text-body text-muted-foreground">
            Pending request to {data.pendingLinkRequest.community.name}.
          </p>
        ) : null}

        <StatStrip
          items={[
            { label: "Games played", value: data.gamesPlayed },
            { label: "Wins", value: data.wins },
            { label: "Losses", value: data.losses },
            {
              label: "Win rate",
              value: winRate(data.gamesPlayed, data.wins),
            },
          ]}
        />

        <section className="space-y-3">
          <h2 className="text-title font-semibold">Members</h2>
          {data.members.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No members"
              description="People on this Team will show up here."
            />
          ) : (
            <RowList>
              {data.members.map((member) => (
                <ListRow
                  key={member.id}
                  leading={
                    <UserAvatar name={member.name ?? "Member"} size="lg" />
                  }
                  title={member.name ?? "Member"}
                  trailing={
                    member.isCreator ? (
                      <Badge variant="outline">Creator</Badge>
                    ) : undefined
                  }
                />
              ))}
            </RowList>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={dissolveOpen}
        onOpenChange={setDissolveOpen}
        title={`Dissolve ${displayName}?`}
        description="This cannot be undone. Cancelling does nothing."
        confirmLabel="Dissolve Team"
        pending={dissolve.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await dissolve.mutateAsync({ teamId: id });
        }}
      />

      <ConfirmDialog
        open={unlinkOpen}
        onOpenChange={setUnlinkOpen}
        title={`Unlink ${displayName}?`}
        description="This Team will no longer be linked to its Community. Cancelling does nothing."
        confirmLabel="Unlink from Community"
        pending={unlink.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await unlink.mutateAsync({ teamId: id });
        }}
      />

      {data.canInvite ? (
        <ResponsiveDialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <ResponsiveDialogContent restoreFocusRef={menuTriggerRef}>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>Invite your partner</ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Look up an existing User by username, email, or phone. The
                invitee accepts on Invites. Lookup invites do not expire.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <div className="space-y-8 px-4 pb-4 md:px-0 md:pb-0">
              <LookupInvitePanel
                description="Look up an existing User by username, email, or phone. The invitee accepts on Invites. Lookup invites do not expire."
                lookupInvites={data.unusedInvite ? [data.unusedInvite] : []}
                sendPending={inviteInApp.isPending}
                revokePending={revokeInvite.isPending}
                sendError={inviteInApp.error}
                onSendLookup={(query) =>
                  inviteInApp.mutate({ teamId: id, query })
                }
                onRevokeLookup={(inviteId) => revokeInvite.mutate({ inviteId })}
              />
              <InviteLinkPanel
                inviteUrl={inviteLink.data?.inviteUrl}
                copyPending={createInviteLink.isPending}
                onCopy={() => createInviteLink.mutate({ teamId: id })}
              />
            </div>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      ) : null}

      {data.canRequestLink ? (
        <ResponsiveDialog open={linkOpen} onOpenChange={setLinkOpen}>
          <ResponsiveDialogContent restoreFocusRef={menuTriggerRef}>
            <ResponsiveDialogHeader>
              <ResponsiveDialogTitle>
                Request Community link
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                Full Teams can request a link to a Community. Owner or Admin
                approve; missing members are auto-admitted.
              </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <form
              className="space-y-4 px-4 pb-4 md:px-0 md:pb-0"
              onSubmit={(event) => {
                event.preventDefault();
                if (requestLink.isPending) {
                  return;
                }
                const formData = new FormData(event.currentTarget);
                const communityIdValue = formData.get("communityId");
                if (typeof communityIdValue !== "string" || !communityIdValue) {
                  return;
                }
                requestLink.mutate({
                  teamId: id,
                  communityId: communityIdValue,
                });
              }}
            >
              <FormErrorSummary
                message={globalFormErrorMessage(requestLink.error)}
              />
              <Field>
                <FieldLabel htmlFor="team-link-community">Community</FieldLabel>
                <select
                  id="team-link-community"
                  name="communityId"
                  required
                  className="border-input bg-background text-foreground focus-visible:ring-ring/50 min-h-11 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
                  defaultValue=""
                  aria-invalid={
                    fieldErrorMessage(requestLink.error, "communityId")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(requestLink.error, "communityId")
                      ? "team-link-community-error"
                      : undefined
                  }
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
                <FieldError id="team-link-community-error">
                  {fieldErrorMessage(requestLink.error, "communityId")}
                </FieldError>
              </Field>
              <Button
                type="submit"
                className="w-full"
                disabled={requestLink.isPending}
              >
                {requestLink.isPending ? "Requesting…" : "Request link"}
              </Button>
            </form>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      ) : null}
    </DashboardShell>
  );
}

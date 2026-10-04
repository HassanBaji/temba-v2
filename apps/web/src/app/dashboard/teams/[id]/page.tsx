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
import { MemberRow } from "~/components/common/member-row";
import { RowList } from "~/components/common/row-list";
import { StatStrip } from "~/components/common/stat-strip";
import { DashboardShell } from "~/components/dashboard-shell";
import { InvitesDialog } from "~/components/invites/invites-dialog";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { EntityHomeHeader } from "~/components/layout/entity-home-header";
import { Section } from "~/components/layout/section";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { formatWinRate } from "@repo/domain/win-rate";
import {
  fieldErrorMessage,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import {
  NO_LINKABLE_COMMUNITY_COPY,
  teamLinkCommunityPicker,
} from "@repo/domain/team-link-community-picker";
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
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupRefused, setLookupRefused] = useState<
    { name: string; message: string }[] | null
  >(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const team = api.teams.byId.useQuery({ id });

  const inviteLink = api.teams.getInviteLink.useQuery(
    { teamId: id },
    { enabled: Boolean(team.data?.canInvite) },
  );
  const lookupSearch = api.teams.searchLookupUsers.useQuery(
    { teamId: id, query: lookupQuery },
    { enabled: inviteOpen && Boolean(team.data?.canInvite) },
  );

  const inviteInApp = api.teams.inviteInApp.useMutation({
    onSuccess: async () => {
      setLookupRefused([]);
      toast.success("Lookup invite sent");
      await utils.teams.byId.invalidate({ id });
      await utils.teams.searchLookupUsers.invalidate({ teamId: id });
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

  const linkPicker = teamLinkCommunityPicker({
    isLoading: communities.isLoading,
    isError: communities.isError,
    data: communities.data,
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
      <DashboardShell title="Team" hidePageHeader isSubPage>
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  if (isForbiddenError(team.error)) {
    return (
      <DashboardShell title="Team" isSubPage>
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
      <DashboardShell title="Team" isSubPage>
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
      <DashboardShell title="Team" isSubPage>
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
    image: member.image,
  }));

  return (
    <DashboardShell title="Team" hidePageHeader isSubPage>
      <div className="space-y-6">
        <EntityHomeHeader
          leading={
            <AvatarStack
              people={people}
              openSeats={data.waitingForPartner ? 1 : 0}
              size="lg"
            />
          }
          title={displayName}
          badges={
            <>
              <SportBadge sport={data.sport} />
              {data.isLoose ? (
                <Badge variant="outline">Not linked to a Community</Badge>
              ) : (
                <Badge variant="outline">Club Team</Badge>
              )}
              {data.waitingForPartner ? (
                <Badge variant="outline">Incomplete</Badge>
              ) : null}
            </>
          }
          meta={
            data.community ? (
              <>
                Linked to{" "}
                <Link
                  href={`/dashboard/communities/${data.community.id}`}
                  className="text-foreground underline underline-offset-2"
                >
                  {data.community.name}
                </Link>
              </>
            ) : undefined
          }
          primaryAction={
            data.waitingForPartner && data.canInvite ? (
              <Button onClick={() => setInviteOpen(true)}>
                Invite your partner
              </Button>
            ) : undefined
          }
          menu={
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
          }
        />

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
              value: formatWinRate(data.wins, data.gamesPlayed),
            },
          ]}
        />

        <Section title="Members">
          {data.members.length === 0 ? (
            <EmptyState
              headingLevel={3}
              icon={Users}
              title="No members"
              description="People on this Team will show up here."
            />
          ) : (
            <RowList>
              {data.members.map((member) => (
                <MemberRow
                  key={member.id}
                  name={member.name ?? "Member"}
                  image={member.image}
                  isViewer={member.isViewer}
                  badge={
                    member.isCreator ? (
                      <Badge variant="outline">Creator</Badge>
                    ) : undefined
                  }
                />
              ))}
            </RowList>
          )}
        </Section>
      </div>

      <ConfirmDialog
        open={dissolveOpen}
        onOpenChange={setDissolveOpen}
        title={`Dissolve ${displayName}?`}
        description="This cannot be undone."
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
        description="This Team will no longer be linked to its Community."
        confirmLabel="Unlink from Community"
        pending={unlink.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await unlink.mutateAsync({ teamId: id });
        }}
      />

      {data.canInvite ? (
        <InvitesDialog
          open={inviteOpen}
          onOpenChange={(next) => {
            setInviteOpen(next);
            if (!next) {
              setLookupQuery("");
              setLookupRefused(null);
            }
          }}
          restoreFocusRef={menuTriggerRef}
          description="Invite a partner for the open seat, or copy a link to share."
          lookup={{
            note: "Pick one person. Invites don't expire.",
            lookupInvites: data.unusedInvite ? [data.unusedInvite] : [],
            sendPending: inviteInApp.isPending,
            revokePendingId: revokeInvite.isPending
              ? revokeInvite.variables?.inviteId
              : undefined,
            sendError: inviteInApp.error,
            searchQuery: lookupQuery,
            onSearchQueryChange: setLookupQuery,
            searchResults: lookupSearch.data,
            searchPending: lookupSearch.isFetching,
            refused: lookupRefused,
            selection: "single",
            onSendUserIds: (userIds) => {
              const userId = userIds[0];
              if (!userId) {
                return;
              }
              inviteInApp.mutate({ teamId: id, userId });
            },
            onRevokeLookup: (inviteId) => revokeInvite.mutate({ inviteId }),
          }}
          link={{
            inviteUrl: inviteLink.data?.inviteUrl,
            copyPending: createInviteLink.isPending,
            onCopy: () => createInviteLink.mutate({ teamId: id }),
          }}
        />
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
              {linkPicker.status === "error" ? (
                <ErrorState
                  headingLevel={3}
                  className="py-6"
                  title="Communities could not be loaded"
                  message={communities.error?.message}
                  onRetry={() => {
                    void communities.refetch();
                  }}
                />
              ) : linkPicker.status === "empty" ? (
                <EmptyState
                  icon={Users}
                  headingLevel={3}
                  className="py-6"
                  title="No Community to link"
                  description={NO_LINKABLE_COMMUNITY_COPY}
                  action={
                    <Button asChild variant="outline">
                      <Link href="/dashboard/communities">
                        Go to Communities
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor="team-link-community">
                      Community
                    </FieldLabel>
                    <Select
                      name="communityId"
                      required
                      disabled={linkPicker.status === "loading"}
                    >
                      <SelectTrigger
                        id="team-link-community"
                        className="w-full"
                        aria-busy={
                          linkPicker.status === "loading" ? true : undefined
                        }
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
                        <SelectValue
                          placeholder={
                            linkPicker.status === "loading"
                              ? "Loading Communities…"
                              : "Select a Community"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {linkPicker.status === "ready"
                          ? linkPicker.communities.map((community) => (
                              <SelectItem
                                key={community.id}
                                value={community.id}
                              >
                                {community.name}
                              </SelectItem>
                            ))
                          : null}
                      </SelectContent>
                    </Select>
                    <FieldError id="team-link-community-error">
                      {fieldErrorMessage(requestLink.error, "communityId")}
                    </FieldError>
                  </Field>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      requestLink.isPending || linkPicker.status === "loading"
                    }
                  >
                    {requestLink.isPending ? "Requesting…" : "Request link"}
                  </Button>
                </>
              )}
            </form>
          </ResponsiveDialogContent>
        </ResponsiveDialog>
      ) : null}
    </DashboardShell>
  );
}

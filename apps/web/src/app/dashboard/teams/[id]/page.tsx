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
import { isForbiddenError } from "@repo/domain/is-forbidden-error";
import {
  TEAM_DISSOLVED_TOAST,
  TEAM_DISSOLVE_LABEL,
  TEAM_ERROR_TITLE,
  TEAM_FORBIDDEN_COPY,
  TEAM_INVITE_DESCRIPTION,
  TEAM_INVITE_PARTNER_LABEL,
  TEAM_LINK_REQUESTED_TOAST,
  TEAM_LOOKUP_NOTE,
  TEAM_NO_MEMBERS_COPY,
  TEAM_REQUEST_LINK_DESCRIPTION,
  TEAM_REQUEST_LINK_LABEL,
  TEAM_REQUEST_LINK_SUBMIT_LABEL,
  TEAM_UNLINKED_TOAST,
  TEAM_UNLINK_LABEL,
  TEAM_WAITING_COPY,
  teamDissolveConfirm,
  teamHomeView,
  teamUnlinkConfirm,
} from "@repo/domain/teams";
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
      toast.success(TEAM_DISSOLVED_TOAST);
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
      toast.success(TEAM_LINK_REQUESTED_TOAST);
      await utils.teams.byId.invalidate({ id });
      setLinkOpen(false);
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const unlink = api.teams.unlink.useMutation({
    onSuccess: async (result) => {
      toast.success(TEAM_UNLINKED_TOAST);
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
          title={TEAM_FORBIDDEN_COPY.title}
          description={TEAM_FORBIDDEN_COPY.description}
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
          title={TEAM_ERROR_TITLE}
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
          title={TEAM_ERROR_TITLE}
          onRetry={() => {
            void team.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const data = team.data;
  const view = teamHomeView(data);
  const displayName = view.title;

  return (
    <DashboardShell title="Team" hidePageHeader isSubPage>
      <div className="space-y-6">
        <EntityHomeHeader
          leading={
            <AvatarStack
              people={view.people}
              openSeats={view.openSeats}
              size="lg"
            />
          }
          title={displayName}
          badges={
            <>
              <SportBadge sport={data.sport} />
              {view.badges.slice(1).map((badge) => (
                <Badge key={badge} variant="outline">
                  {badge}
                </Badge>
              ))}
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
            view.primaryInvite ? (
              <Button onClick={() => setInviteOpen(true)}>
                {TEAM_INVITE_PARTNER_LABEL}
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
                  {TEAM_REQUEST_LINK_LABEL}
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
                  {TEAM_UNLINK_LABEL}
                </ActionMenuItem>
              ) : null}
              {data.canDissolve ? (
                <ActionMenuItem
                  variant="destructive"
                  onSelect={() => setDissolveOpen(true)}
                >
                  {TEAM_DISSOLVE_LABEL}
                </ActionMenuItem>
              ) : null}
            </ActionMenu>
          }
        />

        {view.waitingNote ? (
          <p className="text-body text-muted-foreground">{TEAM_WAITING_COPY}</p>
        ) : null}

        {view.pendingLinkNote ? (
          <p className="text-body text-muted-foreground">
            {view.pendingLinkNote}
          </p>
        ) : null}

        <StatStrip items={view.stats} />

        <Section title="Members">
          {data.members.length === 0 ? (
            <EmptyState
              headingLevel={3}
              icon={Users}
              title={TEAM_NO_MEMBERS_COPY.title}
              description={TEAM_NO_MEMBERS_COPY.description}
            />
          ) : (
            <RowList>
              {view.members.map((member) => (
                <MemberRow
                  key={member.id}
                  name={member.name}
                  image={member.image}
                  isViewer={member.isViewer}
                  badge={
                    member.creatorLabel ? (
                      <Badge variant="outline">{member.creatorLabel}</Badge>
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
        {...teamDissolveConfirm(displayName)}
        pending={dissolve.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await dissolve.mutateAsync({ teamId: id });
        }}
      />

      <ConfirmDialog
        open={unlinkOpen}
        onOpenChange={setUnlinkOpen}
        {...teamUnlinkConfirm(displayName)}
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
          description={TEAM_INVITE_DESCRIPTION}
          lookup={{
            note: TEAM_LOOKUP_NOTE,
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
                {TEAM_REQUEST_LINK_LABEL}
              </ResponsiveDialogTitle>
              <ResponsiveDialogDescription>
                {TEAM_REQUEST_LINK_DESCRIPTION}
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
                    {requestLink.isPending
                      ? "Requesting…"
                      : TEAM_REQUEST_LINK_SUBMIT_LABEL}
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

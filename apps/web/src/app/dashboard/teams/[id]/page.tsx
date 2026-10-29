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
import { InviteDoorDialog } from "~/components/invites/invite-door-dialog";
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
  TEAM_LEAVE_LABEL,
  TEAM_LEFT_TOAST,
  TEAM_LINK_REQUESTED_TOAST,
  TEAM_NO_MEMBERS_COPY,
  TEAM_REQUEST_LINK_DESCRIPTION,
  TEAM_REQUEST_LINK_LABEL,
  TEAM_REQUEST_LINK_SUBMIT_LABEL,
  TEAM_UNLINKED_TOAST,
  TEAM_UNLINK_LABEL,
  teamDissolveConfirm,
  teamHomeView,
  teamLeaveConfirm,
  teamLookupNote,
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
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);

  const team = api.teams.byId.useQuery({ id });

  const dissolve = api.teams.dissolve.useMutation({
    onSuccess: async () => {
      toast.success(TEAM_DISSOLVED_TOAST);
      await utils.teams.mine.invalidate();
      router.push("/dashboard/teams");
    },
  });

  const leave = api.teams.leave.useMutation({
    onSuccess: async () => {
      toast.success(TEAM_LEFT_TOAST);
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
                {view.inviteLabel}
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
                  {view.squad ? "Invite players" : "Invite partner"}
                </ActionMenuItem>
              ) : null}
              {data.canRequestLink ? (
                <ActionMenuItem onSelect={() => setLinkOpen(true)}>
                  {TEAM_REQUEST_LINK_LABEL}
                </ActionMenuItem>
              ) : null}
              {view.canUnlink || view.canDissolve || view.canLeave ? (
                <ActionMenuSeparator />
              ) : null}
              {view.canLeave ? (
                <ActionMenuItem
                  variant="destructive"
                  onSelect={() => setLeaveOpen(true)}
                >
                  {TEAM_LEAVE_LABEL}
                </ActionMenuItem>
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
          <p className="text-body text-muted-foreground">{view.waitingCopy}</p>
        ) : null}

        {view.requestLinkHint ? (
          <p className="text-body text-muted-foreground">
            {view.requestLinkHint}
          </p>
        ) : null}

        {view.pendingLinkNote ? (
          <p className="text-body text-muted-foreground">
            {view.pendingLinkNote}
          </p>
        ) : null}

        <StatStrip items={view.stats} />

        <Section
          title="Members"
          description={
            view.roster.label
              ? [view.roster.label, view.roster.status]
                  .filter(Boolean)
                  .join(" · ")
              : undefined
          }
        >
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
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        {...teamLeaveConfirm(displayName)}
        pending={leave.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await leave.mutateAsync({ teamId: id });
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
        <InviteDoorDialog
          door={{
            kind: "team",
            teamId: id,
            squad: view.squad,
            roster: data.roster,
            canLookup: true,
            canLink: true,
            subtitle: teamLookupNote(view.squad),
          }}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          restoreFocusRef={menuTriggerRef}
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

"use client";

import { Lock } from "lucide-react";
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
import { StatStrip } from "~/components/common/stat-strip";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { InviteDoorDialog } from "~/components/invites/invite-door-dialog";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { EntityHomeHeader } from "~/components/layout/entity-home-header";
import { Section } from "~/components/layout/section";
import { TeamFormLine } from "~/components/teams/team-form-line";
import { TeamGamesList } from "~/components/teams/team-games-list";
import { TeamRivalsList } from "~/components/teams/team-rivals-list";
import { TeamRosterList } from "~/components/teams/team-roster-list";
import { SportBadge } from "~/components/temba/sport-badge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { isForbiddenError } from "@repo/domain/is-forbidden-error";
import {
  teamDissolveConfirm,
  teamHomeView,
  teamLeaveConfirm,
  teamLookupNote,
} from "@repo/domain/teams";
import { api } from "~/trpc/react";

export default function TeamHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const [dissolveOpen, setDissolveOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const team = api.teams.byId.useQuery({ id });

  const dissolve = api.teams.dissolve.useMutation({
    onSuccess: async () => {
      toast.success(m.team.toast.dissolved);
      await utils.teams.mine.invalidate();
      router.push("/dashboard/teams");
    },
  });

  const setGroupTag = api.teams.setGroupTag.useMutation({
    onError: (error) => {
      toast.error(error.message);
    },
  });

  async function changeGroupTag(groupId: string | null, toastMessage: string) {
    await setGroupTag.mutateAsync({ teamId: id, groupId });
    toast.success(toastMessage);
    await Promise.all([
      utils.teams.byId.invalidate({ id }),
      utils.groups.byId.invalidate(),
    ]);
  }

  const leave = api.teams.leave.useMutation({
    onSuccess: async () => {
      toast.success(m.team.toast.left);
      await utils.teams.mine.invalidate();
      router.push("/dashboard/teams");
    },
  });

  if (isNotFoundError(team.error)) {
    notFound();
  }

  if (team.isLoading) {
    return (
      <DashboardShell title={m.team.fallbackName} hidePageHeader isSubPage>
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  if (isForbiddenError(team.error)) {
    return (
      <DashboardShell title={m.team.fallbackName} isSubPage>
        <EmptyState
          icon={Lock}
          title={m.team.forbidden.title}
          description={m.team.forbidden.description}
          action={
            <Button asChild>
              <Link href="/dashboard/teams">
                {m.webDashboard.team.backToTeams}
              </Link>
            </Button>
          }
        />
      </DashboardShell>
    );
  }

  if (team.error) {
    return (
      <DashboardShell title={m.team.fallbackName} isSubPage>
        <ErrorState
          title={m.team.teamErrorTitle}
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
      <DashboardShell title={m.team.fallbackName} isSubPage>
        <ErrorState
          title={m.team.teamErrorTitle}
          onRetry={() => {
            void team.refetch();
          }}
        />
      </DashboardShell>
    );
  }

  const data = team.data;
  const view = teamHomeView(data, locale);
  const displayName = view.title;

  return (
    <DashboardShell title={m.team.fallbackName} hidePageHeader isSubPage>
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
          primaryAction={
            view.primaryInvite ? (
              <Button onClick={() => setInviteOpen(true)}>
                {view.inviteLabel}
              </Button>
            ) : undefined
          }
          menu={
            <ActionMenu
              triggerRef={menuTriggerRef}
              label={m.webDashboard.team.actionsLabel}
            >
              <ActionMenuItem asChild>
                <Link href="/dashboard/teams">
                  {m.webDashboard.team.allTeams}
                </Link>
              </ActionMenuItem>
              {data.canInvite ? (
                <ActionMenuItem onSelect={() => setInviteOpen(true)}>
                  {view.squad
                    ? m.team.squadInviteLabel
                    : m.webDashboard.team.invitePartner}
                </ActionMenuItem>
              ) : null}
              {view.groupTag.options.map((option) => (
                <ActionMenuItem
                  key={option.groupId}
                  disabled={setGroupTag.isPending}
                  onSelect={() =>
                    void changeGroupTag(option.groupId, option.toast).catch(
                      () => undefined,
                    )
                  }
                >
                  {option.label}
                </ActionMenuItem>
              ))}
              {view.groupTag.remove ? (
                <ActionMenuItem
                  disabled={setGroupTag.isPending}
                  onSelect={() => {
                    const removed = view.groupTag.remove;
                    if (removed) {
                      void changeGroupTag(null, removed.toast).catch(
                        () => undefined,
                      );
                    }
                  }}
                >
                  {view.groupTag.remove.label}
                </ActionMenuItem>
              ) : null}
              {view.canDissolve || view.canLeave ? (
                <ActionMenuSeparator />
              ) : null}
              {view.canLeave ? (
                <ActionMenuItem
                  variant="destructive"
                  onSelect={() => setLeaveOpen(true)}
                >
                  {m.team.leaveLabel}
                </ActionMenuItem>
              ) : null}
              {data.canDissolve ? (
                <ActionMenuItem
                  variant="destructive"
                  onSelect={() => setDissolveOpen(true)}
                >
                  {m.team.dissolveLabel}
                </ActionMenuItem>
              ) : null}
            </ActionMenu>
          }
        />

        {view.groupTag.line && data.groupTag ? (
          <p className="text-body text-muted-foreground">
            <Link
              href={`/dashboard/groups/${data.groupTag.id}`}
              className="underline-offset-4 hover:underline"
            >
              {view.groupTag.line}
            </Link>
          </p>
        ) : null}

        {view.waitingNote ? (
          <p className="text-body text-muted-foreground">{view.waitingCopy}</p>
        ) : null}

        <div className="space-y-2">
          <StatStrip items={view.recordTiles} />
          {view.rosterHero ? (
            <p className="text-meta text-muted-foreground">
              {[
                view.rosterHero.label,
                view.roster.status,
                view.rosterHero.plays,
              ]
                .filter(Boolean)
                .join(m.common.listSeparator)}
            </p>
          ) : null}
          {view.teamLevel ? (
            <p className="text-meta text-muted-foreground">{view.teamLevel}</p>
          ) : null}
        </div>

        <Section title={m.team.form.title}>
          <TeamFormLine form={view.form} />
        </Section>

        <Section title={m.team.rivals.title}>
          <TeamRivalsList view={view} />
        </Section>

        <Section title={m.team.roster.title}>
          <TeamRosterList view={view} onAddMore={() => setInviteOpen(true)} />
        </Section>

        <Section title={m.team.games.title}>
          <TeamGamesList view={view} />
        </Section>
      </div>

      <ConfirmDialog
        open={dissolveOpen}
        onOpenChange={setDissolveOpen}
        {...teamDissolveConfirm(displayName, locale)}
        pending={dissolve.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await dissolve.mutateAsync({ teamId: id });
        }}
      />

      <ConfirmDialog
        open={leaveOpen}
        onOpenChange={setLeaveOpen}
        {...teamLeaveConfirm(displayName, locale)}
        pending={leave.isPending}
        restoreFocusRef={menuTriggerRef}
        onConfirm={async () => {
          await leave.mutateAsync({ teamId: id });
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
            subtitle: teamLookupNote(view.squad, locale),
          }}
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          restoreFocusRef={menuTriggerRef}
        />
      ) : null}
    </DashboardShell>
  );
}

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
import { useLocale, useMessages } from "~/components/locale-provider";
import { InviteDoorDialog } from "~/components/invites/invite-door-dialog";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { EntityHomeHeader } from "~/components/layout/entity-home-header";
import { Section } from "~/components/layout/section";
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

        {view.waitingNote ? (
          <p className="text-body text-muted-foreground">{view.waitingCopy}</p>
        ) : null}

        <StatStrip items={view.stats} />

        <Section
          title={m.webDashboard.team.membersTitle}
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
              title={m.team.noMembers.title}
              description={m.team.noMembers.description}
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

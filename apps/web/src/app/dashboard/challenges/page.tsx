"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";

import { ChallengeOpenSegment } from "~/components/challenges/challenge-open-segment";
import { ChallengeMineSegment } from "~/components/challenges/challenge-mine-segment";
import { ChallengeTeamsSegment } from "~/components/challenges/challenge-teams-segment";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  challengeBoardQuery,
  NO_CHALLENGE_BOARD_FILTERS,
  type ChallengeBoardFilters,
} from "@repo/domain/challenge-card";
import {
  challengesSegments,
  challengesTabFromQuery,
  challengesTabQuery,
} from "@repo/domain/challenges-tab";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

export default function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const query = use(searchParams);
  const tabParam = Array.isArray(query.tab) ? query.tab[0] : query.tab;
  const tab = challengesTabFromQuery(tabParam);
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname() ?? "/dashboard/challenges";
  const utils = api.useUtils();

  function setTab(next: string) {
    const resolved = challengesTabFromQuery(next);
    if (resolved === tab) {
      return;
    }
    router.replace(`${pathname}${challengesTabQuery(resolved)}`, {
      scroll: false,
    });
  }

  const [filters, setFilters] = useState<ChallengeBoardFilters>(
    NO_CHALLENGE_BOARD_FILTERS,
  );
  const challenges = api.challenges.listMine.useQuery();
  const board = api.challenges.listOpen.useQuery(challengeBoardQuery(filters), {
    enabled: tab === "open",
  });
  const teams = api.teams.mine.useQuery();
  const pending = api.teams.pendingInvites.useQuery();
  const organized = api.games.listCreateGroups.useQuery(undefined, {
    enabled: tab === "teams",
  });
  const noTeams = teams.data?.length === 0;
  const viewer = api.users.profileDetails.useQuery(undefined, {
    enabled: tab === "teams" && noTeams,
  });

  const [declining, setDeclining] = useState<{
    id: string;
    teamName: string;
  } | null>(null);
  const decline = api.challenges.declineProposal.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.challenge.proposal.declined);
      await Promise.all([
        utils.challenges.listMine.invalidate(),
        utils.challenges.byId.invalidate(),
        utils.challenges.listOpen.invalidate(),
      ]);
    },
  });

  const [confirming, setConfirming] = useState<{
    id: string;
    teamName: string;
  } | null>(null);
  const confirmProposal = api.challenges.confirmProposal.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async (result) => {
      toast.success(m.challenge.proposal.confirmed);
      await Promise.all([
        utils.challenges.invalidate(),
        utils.games.invalidate(),
      ]);
      router.push(`/dashboard/games/${result.gameId}`);
    },
  });

  const accept = api.teams.acceptInAppInvite.useMutation({
    onSuccess: async (result) => {
      toast.success(m.team.toast.joined);
      await Promise.all([
        utils.teams.pendingInvites.invalidate(),
        utils.teams.mine.invalidate(),
      ]);
      router.push(`/dashboard/teams/${result.teamId}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const segments = challengesSegments(
    {
      open: challenges.data?.counts.open ?? null,
      mine: challenges.data?.counts.mine ?? null,
      teams: teams.data?.length ?? null,
    },
    locale,
  );
  const goToTeams = () => setTab("teams");

  return (
    <DashboardShell
      title={m.common.challenges}
      action={
        <Link
          href="/dashboard/challenges/new"
          aria-label={m.challenge.post.cta}
          className="bg-control text-on-control focus-visible:ring-ring/50 hover:bg-control/90 flex size-11 items-center justify-center rounded-lg outline-none focus-visible:ring-[3px]"
        >
          <PlusIcon aria-hidden="true" className="size-5" />
        </Link>
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="mt-2 gap-4 lg:mt-0">
        <TabsList
          aria-label={m.challenge.segments.label}
          className="border-rule h-auto w-full justify-start gap-6 rounded-none border-b bg-transparent p-0"
        >
          {segments.map((segment) => (
            <TabsTrigger
              key={segment.key}
              value={segment.key}
              aria-label={segment.accessibilityLabel}
              className="text-body text-muted-foreground hover:text-foreground data-[state=active]:border-ink data-[state=active]:text-foreground -mb-px h-auto min-h-11 flex-none items-baseline gap-1.5 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 py-3 font-normal shadow-none data-[state=active]:border-b-2 data-[state=active]:border-solid data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:shadow-none"
            >
              {segment.label}
              {segment.count != null ? (
                <span className="text-muted-foreground font-normal">
                  {segment.count}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="open">
          <ChallengeOpenSegment
            board={board.data}
            loading={board.isLoading}
            error={board.error}
            filters={filters}
            onFilter={(key, value) =>
              setFilters((current) => ({
                ...current,
                [key]: current[key] === value ? null : value,
              }))
            }
            onClearFilters={() => setFilters(NO_CHALLENGE_BOARD_FILTERS)}
            onRetry={() => {
              void board.refetch();
            }}
            onGoToTeams={goToTeams}
          />
        </TabsContent>
        <TabsContent value="mine">
          <ChallengeMineSegment
            items={challenges.data?.items}
            loading={challenges.isLoading}
            onConfirm={setConfirming}
            onDecline={setDeclining}
            onGoToTeams={goToTeams}
          />
        </TabsContent>
        <TabsContent value="teams">
          <ChallengeTeamsSegment
            teams={teams.data}
            teamsLoading={teams.isLoading}
            teamsError={teams.error}
            invites={pending.data}
            invitesError={pending.error}
            organizedGroups={organized.data ?? []}
            viewerName={viewer.data?.name ?? null}
            acceptingId={
              accept.isPending ? (accept.variables?.inviteId ?? null) : null
            }
            onAccept={(inviteId) => accept.mutate({ inviteId })}
            onRetryTeams={() => {
              void teams.refetch();
            }}
            onRetryInvites={() => {
              void pending.refetch();
            }}
          />
        </TabsContent>
      </Tabs>
      <ConfirmDialog
        open={confirming != null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null);
          }
        }}
        title={m.challenge.proposal.confirmSheet.title}
        description={m.challenge.proposal.confirmSheet.description}
        confirmLabel={m.challenge.proposal.confirmSheet.confirm}
        pending={confirmProposal.isPending}
        onConfirm={async () => {
          if (confirming) {
            await confirmProposal.mutateAsync({ proposalId: confirming.id });
          }
        }}
      />
      <ConfirmDialog
        open={declining != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeclining(null);
          }
        }}
        title={m.challenge.proposal.declineConfirm.title}
        description={m.challenge.proposal.declineConfirm.description}
        confirmLabel={m.challenge.proposal.declineConfirm.confirm}
        pending={decline.isPending}
        onConfirm={async () => {
          if (declining) {
            await decline.mutateAsync({ proposalId: declining.id });
          }
        }}
      />
    </DashboardShell>
  );
}

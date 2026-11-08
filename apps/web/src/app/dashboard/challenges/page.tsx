"use client";

import { usePathname, useRouter } from "next/navigation";
import { use } from "react";
import { toast } from "sonner";

import { ChallengeSegmentEmpty } from "~/components/challenges/challenge-segment-empty";
import { ChallengeTeamsSegment } from "~/components/challenges/challenge-teams-segment";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  challengesSegments,
  challengesTabFromQuery,
  challengesTabQuery,
} from "@repo/domain/challenges-tab";
import { api } from "~/trpc/react";

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

  const challenges = api.challenges.listMine.useQuery();
  const teams = api.teams.mine.useQuery();
  const pending = api.teams.pendingInvites.useQuery();
  const organized = api.games.listCreateGroups.useQuery(undefined, {
    enabled: tab === "teams",
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
      description={m.webChallenge.description}
    >
      <Tabs value={tab} onValueChange={setTab} className="mt-4 gap-4">
        <TabsList variant="segmented" aria-label={m.challenge.segments.label}>
          {segments.map((segment) => (
            <TabsTrigger
              key={segment.key}
              value={segment.key}
              aria-label={segment.accessibilityLabel}
              className="group/tab"
            >
              {segment.label}
              {segment.count != null ? (
                <span className="text-muted-foreground group-data-[state=active]/tab:text-dim">
                  {segment.count}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="open">
          <ChallengeSegmentEmpty segment="open" onGoToTeams={goToTeams} />
        </TabsContent>
        <TabsContent value="mine">
          <ChallengeSegmentEmpty segment="mine" onGoToTeams={goToTeams} />
        </TabsContent>
        <TabsContent value="teams">
          <ChallengeTeamsSegment
            teams={teams.data}
            teamsLoading={teams.isLoading}
            teamsError={teams.error}
            invites={pending.data}
            invitesError={pending.error}
            organizedGroups={organized.data ?? []}
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
    </DashboardShell>
  );
}

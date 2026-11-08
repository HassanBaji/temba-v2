import {
  challengeBoardQuery,
  NO_CHALLENGE_BOARD_FILTERS,
  type ChallengeBoardFilters,
} from "@repo/domain/challenge-card";
import {
  challengesTabFromQuery,
  type ChallengesTab,
} from "@repo/domain/challenges-tab";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { useMessages } from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { newTeamPath, teamPath } from "../teams/teams-model";
import { api } from "../trpc/react";
import {
  challengePath,
  NEW_CHALLENGE_PATH,
  setBoardFilter,
} from "./challenges-model";
import { ChallengesView } from "./challenges-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function ChallengesScreen() {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const utils = api.useUtils();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab = challengesTabFromQuery(params.tab);
  const setTab = (next: ChallengesTab) =>
    router.setParams({ tab: next === "open" ? undefined : next });
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ChallengeBoardFilters>(
    NO_CHALLENGE_BOARD_FILTERS,
  );
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const challenges = api.challenges.listMine.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const board = api.challenges.listOpen.useQuery(challengeBoardQuery(filters), {
    ...REFETCH_ON_FOREGROUND,
    enabled: tab === "open",
  });
  const teams = api.teams.mine.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const pending = api.teams.pendingInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );
  const organized = api.games.listCreateGroups.useQuery(undefined, {
    enabled: tab === "teams",
  });

  const accept = api.teams.acceptInAppInvite.useMutation({
    onSuccess: async (result) => {
      toast.show(m.team.toast.joined);
      await Promise.all([
        utils.teams.pendingInvites.invalidate(),
        utils.teams.mine.invalidate(),
      ]);
      router.push(teamPath(result.teamId));
    },
    onError: (error) => toast.show(error.message),
  });

  const decline = api.challenges.declineProposal.useMutation({
    onSuccess: async () => {
      toast.show(m.challenge.proposal.declined);
      await Promise.all([
        utils.challenges.listMine.invalidate(),
        utils.challenges.byId.invalidate(),
        utils.challenges.listOpen.invalidate(),
      ]);
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const refetchAll = useCallback(
    () =>
      Promise.all([
        challenges.refetch(),
        teams.refetch(),
        pending.refetch(),
        ...(tab === "open" ? [board.refetch()] : []),
      ]),
    [challenges, teams, pending, board, tab],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchAll();
    } finally {
      setRefreshing(false);
    }
  }, [refetchAll]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ChallengesView
        tab={tab}
        onTabChange={setTab}
        counts={{
          open: challenges.data?.counts.open ?? null,
          mine: challenges.data?.counts.mine ?? null,
          teams: teams.data?.length ?? null,
        }}
        teams={slotOf(teams)}
        invites={slotOf(pending)}
        organizedGroups={organized.data ?? []}
        acceptingId={
          accept.isPending ? (accept.variables?.inviteId ?? null) : null
        }
        onOpenTeam={(teamId) => router.push(teamPath(teamId))}
        onCreate={(groupId) => router.push(newTeamPath(groupId))}
        onAccept={(inviteId) => accept.mutate({ inviteId })}
        onRetry={() => void refetchAll()}
        mine={{
          items: slotOf({
            data: challenges.data?.items,
            error: challenges.error,
            isLoading: challenges.isLoading,
          }),
          decliningId: decline.isPending
            ? (decline.variables?.proposalId ?? null)
            : null,
          onDecline: (proposal) =>
            setConfirm({
              title: m.challenge.proposal.declineConfirm.title,
              description: m.challenge.proposal.declineConfirm.description,
              details: [proposal.teamName],
              confirmLabel: m.challenge.proposal.declineConfirm.confirm,
              onConfirm: () => decline.mutate({ proposalId: proposal.id }),
            }),
        }}
        open={{
          board: slotOf(board),
          filters,
          onFilter: (key, value) =>
            setFilters((current) => setBoardFilter(current, key, value)),
          onClearFilters: () => setFilters(NO_CHALLENGE_BOARD_FILTERS),
          onOpenChallenge: (id) => router.push(challengePath(id)),
          onPost: () => router.push(NEW_CHALLENGE_PATH),
          onRetry: () => void board.refetch(),
        }}
      />
      <ConfirmSheet
        request={confirm}
        pending={decline.isPending}
        onClose={() => setConfirm(null)}
      />
    </Screen>
  );
}

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
        posted={slotOf({
          data: challenges.data?.posted,
          error: challenges.error,
          isLoading: challenges.isLoading,
        })}
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
    </Screen>
  );
}

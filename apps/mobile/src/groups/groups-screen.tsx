import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { groupsTabFromQuery } from "@repo/domain/groups-tab";
import {
  DEFAULT_PUBLIC_GROUP_SPORT_FILTER,
  publicGroupSportFilterInput,
  type PublicGroupSportFilter,
} from "@repo/domain/sport";

import { slotOf } from "../lib/slot-of";
import { apiOrigin } from "../lib/api-origin-runtime";
import { Screen } from "../primitives/screen";
import { api } from "../trpc/react";
import { groupPath, type GroupsTab } from "./groups-model";
import { GroupsView } from "./groups-view";
import { RequestJoinSheet } from "./request-join-sheet";
import { useGroupJoin } from "./use-group-join";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function GroupsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab = groupsTabFromQuery(params.tab);
  const setTab = (next: GroupsTab) =>
    router.setParams({ tab: next === "mine" ? undefined : next });
  const [sportFilter, setSportFilter] = useState<PublicGroupSportFilter>(
    DEFAULT_PUBLIC_GROUP_SPORT_FILTER,
  );
  const [refreshing, setRefreshing] = useState(false);
  const { join, pendingGroupId, requestSheet } = useGroupJoin();

  const mine = api.groups.mine.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const publicGroups = api.groups.listPublic.useQuery(
    publicGroupSportFilterInput(sportFilter),
    {
      ...REFETCH_ON_FOREGROUND,
      enabled: tab === "public",
    },
  );

  const refetchActive = useCallback(
    () =>
      tab === "public"
        ? Promise.all([mine.refetch(), publicGroups.refetch()])
        : mine.refetch(),
    [tab, mine, publicGroups],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchActive();
    } finally {
      setRefreshing(false);
    }
  }, [refetchActive]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <GroupsView
        tab={tab}
        onTabChange={setTab}
        sportFilter={sportFilter}
        onSportFilterChange={setSportFilter}
        mine={slotOf(mine)}
        publicGroups={slotOf(publicGroups)}
        apiOrigin={apiOrigin}
        pendingGroupId={pendingGroupId}
        onOpen={(groupId) => router.push(groupPath(groupId))}
        onJoin={join}
        onRetry={() => void refetchActive()}
        onCreate={() => router.push("/groups/new")}
      />
      <RequestJoinSheet {...requestSheet} />
    </Screen>
  );
}

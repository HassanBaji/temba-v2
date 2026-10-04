import { Link, useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { slotOf } from "../lib/slot-of";
import { apiOrigin } from "../lib/api-origin-runtime";
import { Screen } from "../primitives/screen";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { groupPath, type GroupsTab } from "./groups-model";
import { GroupsView } from "./groups-view";
import { useGroupJoin } from "./use-group-join";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function GroupsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<GroupsTab>("mine");
  const [refreshing, setRefreshing] = useState(false);
  const { join, pendingGroupId } = useGroupJoin();

  const mine = api.groups.mine.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const publicGroups = api.groups.listPublic.useQuery(undefined, {
    ...REFETCH_ON_FOREGROUND,
    enabled: tab === "public",
  });

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
        mine={slotOf(mine)}
        publicGroups={slotOf(publicGroups)}
        apiOrigin={apiOrigin}
        pendingGroupId={pendingGroupId}
        onOpen={(groupId) => router.push(groupPath(groupId))}
        onJoin={join}
        onRetry={() => void refetchActive()}
      />
      {__DEV__ ? (
        <Link href="/gallery-groups">
          <Text size="meta" weight="medium">
            Open the Groups states gallery
          </Text>
        </Link>
      ) : null}
    </Screen>
  );
}

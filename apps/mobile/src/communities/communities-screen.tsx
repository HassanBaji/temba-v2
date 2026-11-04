import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { Notice } from "../groups/notice";
import { groupPath } from "../groups/groups-model";
import { useMessages } from "../i18n/locale-provider";
import { apiOrigin } from "../lib/api-origin-runtime";
import { slotOf } from "../lib/slot-of";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { api } from "../trpc/react";
import { NEW_COMMUNITY_PATH, communityPath } from "./communities-model";
import { CommunitiesView } from "./communities-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function CommunitiesScreen() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const m = useMessages();
  const [refreshing, setRefreshing] = useState(false);
  const hasCreateAccess = user?.publicMetadata.groupCreator === true;

  const mine = api.communities.mine.useQuery(undefined, {
    ...REFETCH_ON_FOREGROUND,
    enabled: isLoaded && hasCreateAccess,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await mine.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [mine]);

  if (isLoaded && !hasCreateAccess) {
    return (
      <Screen>
        <ScreenHeader title={m.community.title} />
        <Notice
          title={m.mobileCommunity.list.limitedTitle}
          description={m.mobileCommunity.list.limitedDescription}
        />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <CommunitiesView
        communities={slotOf(mine)}
        apiOrigin={apiOrigin}
        onOpen={(communityId) => router.push(communityPath(communityId))}
        onOpenGroup={(groupId) => router.push(groupPath(groupId))}
        onCreate={() => router.push(NEW_COMMUNITY_PATH)}
        onRetry={() => void mine.refetch()}
      />
    </Screen>
  );
}

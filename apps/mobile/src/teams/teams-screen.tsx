import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

import { useMessages } from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { NEW_TEAM_PATH, teamPath } from "./teams-model";
import { TeamsView } from "./teams-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function TeamsScreen() {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);

  const teams = api.teams.mine.useQuery(undefined, REFETCH_ON_FOREGROUND);
  const pending = api.teams.pendingInvites.useQuery(
    undefined,
    REFETCH_ON_FOREGROUND,
  );

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
    () => Promise.all([teams.refetch(), pending.refetch()]),
    [teams, pending],
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
      <TeamsView
        teams={slotOf(teams)}
        invites={slotOf(pending)}
        acceptingId={
          accept.isPending ? (accept.variables?.inviteId ?? null) : null
        }
        onOpen={(teamId) => router.push(teamPath(teamId))}
        onCreate={() => router.push(NEW_TEAM_PATH)}
        onAccept={(inviteId) => accept.mutate({ inviteId })}
        onRetry={() => void refetchAll()}
      />
    </Screen>
  );
}

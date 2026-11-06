import { isForbiddenError } from "@repo/domain/is-forbidden-error";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  teamDissolveConfirm,
  teamHomeView,
  teamLeaveConfirm,
} from "@repo/domain/teams";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";

import type { ConfirmRequest } from "../game-details/confirm-sheet";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { InviteDoorSheet } from "../invites/invite-door-sheet";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { TEAMS_PATH } from "./teams-model";
import { TeamHomeView } from "./team-home-view";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

export function TeamHomeScreen({ teamId }: { teamId: string }) {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const team = api.teams.byId.useQuery({ id: teamId }, REFETCH_ON_FOREGROUND);
  const data = team.data;

  const dissolve = api.teams.dissolve.useMutation({
    onSuccess: async () => {
      toast.show(m.team.toast.dissolved);
      await utils.teams.mine.invalidate();
      router.replace(TEAMS_PATH);
    },
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
    onSettled: () => setConfirm(null),
  });

  const leave = api.teams.leave.useMutation({
    onSuccess: async () => {
      toast.show(m.team.toast.left);
      await utils.teams.mine.invalidate();
      router.replace(TEAMS_PATH);
    },
    onError: (error) => {
      setActionError(error.message);
      toast.show(error.message);
    },
    onSettled: () => setConfirm(null),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await team.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [team]);

  const view = data ? teamHomeView(data, locale) : null;
  const header = <ScreenHeader nav="back" fallback={TEAMS_PATH} />;

  if (isNotFoundError(team.error)) {
    return (
      <Screen>
        {header}
        <Notice {...m.team.notFound} />
      </Screen>
    );
  }

  if (isForbiddenError(team.error)) {
    return (
      <Screen>
        {header}
        <Notice {...m.team.forbidden} />
      </Screen>
    );
  }

  if (team.error && !data) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title={m.team.teamErrorTitle}
          description={team.error.message}
          onRetry={() => void team.refetch()}
        />
      </Screen>
    );
  }

  if (!data || !view) {
    return (
      <Screen>
        {header}
        <Skeleton height={72} radius={16} />
        <Skeleton height={96} radius={16} />
        <Skeleton height={160} radius={16} />
      </Screen>
    );
  }

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <TeamHomeView
        view={view}
        sport={data.sport}
        confirm={confirm}
        confirmPending={dissolve.isPending || leave.isPending}
        actionError={actionError}
        onInvite={() => setInviteOpen(true)}
        onDissolve={() => {
          setActionError(null);
          setConfirm({
            ...teamDissolveConfirm(view.title, locale),
            onConfirm: () => dissolve.mutate({ teamId }),
          });
        }}
        onLeave={() => {
          setActionError(null);
          setConfirm({
            ...teamLeaveConfirm(view.title, locale),
            onConfirm: () => leave.mutate({ teamId }),
          });
        }}
        onCloseConfirm={() => setConfirm(null)}
      />
      {data.canInvite ? (
        <InviteDoorSheet
          visible={inviteOpen}
          onClose={() => setInviteOpen(false)}
          door={{
            kind: "team",
            teamId,
            squad: view.squad,
            canLookup: true,
            canLink: true,
          }}
        />
      ) : null}
    </Screen>
  );
}

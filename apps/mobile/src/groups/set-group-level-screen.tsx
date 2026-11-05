import { viewerMaySetGroupLevel } from "@repo/domain/group-home-chrome";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { FieldError } from "../create-game/chips";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { groupPath } from "./groups-model";
import { Notice } from "./notice";
import { setGroupLevelView, type SetGroupLevelView } from "./set-level-model";
import { LevelPicker } from "./set-level-screen";

function SetGroupLevelForm({
  groupId,
  view,
}: {
  groupId: string;
  view: SetGroupLevelView;
}) {
  const m = useMessages();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [tenths, setTenths] = useState(view.startTenths);

  const setGroupLevel = api.ratings.setGroupLevel.useMutation({
    onSuccess: async () => {
      toast.show(m.you.setGroupLevel.saved);
      await utils.groups.byId.invalidate({ id: groupId });
      router.dismissTo(groupPath(groupId));
    },
  });

  const error = setGroupLevel.error
    ? splitTrpcFormError(setGroupLevel.error).globalMessage
    : null;

  return (
    <Screen
      footer={
        <View style={{ flex: 1, gap: 10 }}>
          <Text>{view.note}</Text>
          <Button
            label={m.you.setGroupLevel.save}
            size="lg"
            pending={setGroupLevel.isPending}
            onPress={() =>
              setGroupLevel.mutate({
                groupId,
                userId: view.userId,
                levelTenths: tenths,
              })
            }
          />
        </View>
      }
    >
      <ScreenHeader
        nav="back"
        fallback={groupPath(groupId)}
        title={m.you.setGroupLevel.title}
      />
      <Text weight="semibold">{view.name}</Text>
      <LevelPicker
        tenths={tenths}
        onTenths={setTenths}
        currentTenths={view.startTenths}
        wasLabel={view.startLabel}
        markerLabel={view.markerLabel}
        disabled={setGroupLevel.isPending}
      />
      <FieldError message={error ?? undefined} />
    </Screen>
  );
}

export function SetGroupLevelScreen({
  groupId,
  userId,
}: {
  groupId: string;
  userId: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const group = api.groups.byId.useQuery({ id: groupId });
  const header = <ScreenHeader nav="back" fallback={groupPath(groupId)} />;

  if (isNotFoundError(group.error)) {
    return (
      <Screen>
        {header}
        <Notice {...m.mobileGroup.setLevel.notFound} />
      </Screen>
    );
  }

  if (group.error && !group.data) {
    return (
      <Screen>
        {header}
        <Notice
          alert
          title={m.mobileGroup.loadFailed.level}
          description={group.error.message}
          onRetry={() => void group.refetch()}
        />
      </Screen>
    );
  }

  if (!group.data) {
    return (
      <Screen>
        {header}
        <Skeleton height={160} radius={16} />
        <Skeleton height={120} radius={16} />
      </Screen>
    );
  }

  const data = group.data;
  const entry = viewerMaySetGroupLevel({
    sport: data.sport,
    canCreateGame: data.canCreateGame,
    leaderboard: data.standing.leaderboard,
  })
    ? data.standing.leaderboard.find(
        (candidate) => candidate.userId === userId && !candidate.isViewer,
      )
    : undefined;

  if (!entry) {
    return (
      <Screen>
        {header}
        <Notice {...m.mobileGroup.setLevel.notFound} />
      </Screen>
    );
  }

  return (
    <SetGroupLevelForm
      groupId={groupId}
      view={setGroupLevelView(
        entry,
        data.name ?? m.mobileGroup.photoFallbackName,
        locale,
      )}
    />
  );
}

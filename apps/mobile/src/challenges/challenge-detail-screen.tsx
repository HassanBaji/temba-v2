import { spacing } from "@repo/design-tokens";
import {
  challengeCardView,
  challengeLevelWanted,
} from "@repo/domain/challenge-card";
import { formatGameDay } from "@repo/domain/format-game-start";
import { headToHeadLine } from "@repo/domain/team-rivals";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { teamPath } from "../teams/teams-model";
import { api } from "../trpc/react";
import { ChallengeSeats } from "./challenge-card";
import {
  CHALLENGES_PATH,
  challengeCardInput,
  MINE_PATH,
} from "./challenges-model";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2, paddingVertical: 10 }}>
      <Text size="eyebrow" tone="muted" mono uppercase>
        {label}
      </Text>
      <Text>{value}</Text>
    </View>
  );
}

/** 2a: one Challenge in its open state. */
export function ChallengeDetailScreen({
  challengeId,
}: {
  challengeId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const challenge = api.challenges.byId.useQuery(
    { id: challengeId },
    REFETCH_ON_FOREGROUND,
  );

  const withdraw = api.challenges.withdraw.useMutation({
    onSuccess: async () => {
      toast.show(m.challenge.detail.withdrawn);
      await Promise.all([
        utils.challenges.byId.invalidate({ id: challengeId }),
        utils.challenges.listOpen.invalidate(),
        utils.challenges.listMine.invalidate(),
        utils.challenges.listPostOptions.invalidate(),
      ]);
      router.replace(MINE_PATH);
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await challenge.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [challenge]);

  const header = (
    <ScreenHeader
      nav="back"
      fallback={CHALLENGES_PATH}
      title={m.challenge.detail.title}
    />
  );

  if (challenge.isLoading) {
    return (
      <Screen>
        {header}
        <Skeleton height={320} radius={16} />
      </Screen>
    );
  }
  if (challenge.error || !challenge.data) {
    return (
      <Screen>
        {header}
        <Notice
          alert
          title={m.challenge.detail.errorTitle}
          description={challenge.error?.message ?? ""}
          onRetry={() => void challenge.refetch()}
        />
      </Screen>
    );
  }

  const data = challenge.data;
  const now = new Date();
  const card = challengeCardView(challengeCardInput(data), locale, now);
  const open = data.state === "open";
  const detail = m.challenge.detail;
  const eligibleLine =
    data.viewerEligibleTeams.length > 0
      ? detail.proposeWith(
          data.viewerEligibleTeams
            .map((team) => team.displayName)
            .join(m.challenge.when.listSeparator),
        )
      : null;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {header}
      <View style={{ gap: spacing.section }}>
        {data.state !== "open" ? (
          <Surface>
            <Text weight="semibold" accessibilityRole="alert">
              {detail.closed[data.state]}
            </Text>
          </Surface>
        ) : null}
        <Surface style={{ gap: spacing.compact }}>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push(teamPath(data.team.id))}
          >
            <Text size="title" weight="semibold">
              {card.title}
            </Text>
          </Pressable>
          <Text size="meta">{card.sportLine}</Text>
          <ChallengeSeats card={card} />
          {open ? (
            <Text size="meta" tone="muted">
              {card.proposalsLine}
            </Text>
          ) : null}
        </Surface>
        <Surface padded={false} style={{ paddingHorizontal: spacing.surface }}>
          <DetailRow
            label={detail.record}
            value={headToHeadLine(data.team.record, data.sport, locale)}
          />
          <Hairline />
          <DetailRow
            label={detail.when}
            value={[card.whenLine, card.slotsLine]
              .filter((line): line is string => line != null)
              .join(m.group.metaSeparator)}
          />
          <Hairline />
          <DetailRow label={detail.where} value={card.venuesLine} />
          <Hairline />
          <DetailRow
            label={detail.level}
            value={challengeLevelWanted(
              data.levelMinTenths,
              data.levelMaxTenths,
              locale,
            )}
          />
          {data.note ? (
            <>
              <Hairline />
              <DetailRow label={detail.note} value={data.note} />
            </>
          ) : null}
        </Surface>
        <Text size="meta" tone="muted">
          {detail.postedBy(
            data.postedBy.name ?? m.team.memberFallback,
            formatGameDay(data.createdAt, locale, { weekday: "short" }),
          )}
        </Text>
        {open && eligibleLine ? (
          <Text weight="medium">{eligibleLine}</Text>
        ) : null}
        {open && card.greyedLine ? (
          <Text weight="medium">{card.greyedLine}</Text>
        ) : null}
        {data.viewerCanWithdraw ? (
          <Button
            label={detail.withdraw}
            variant="outline"
            onPress={() =>
              setConfirm({
                title: detail.withdrawConfirm.title,
                description: detail.withdrawConfirm.description,
                confirmLabel: detail.withdrawConfirm.confirm,
                onConfirm: () => withdraw.mutate({ challengeId }),
              })
            }
          />
        ) : null}
      </View>
      <ConfirmSheet
        request={confirm}
        pending={withdraw.isPending}
        onClose={() => setConfirm(null)}
      />
    </Screen>
  );
}

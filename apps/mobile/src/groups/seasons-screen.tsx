import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  SEASON_POINTS,
  closeSeasonActionLabel,
  closeSeasonBody,
  closeSeasonTitle,
  formatSeasonRange,
  seasonClosedToast,
  seasonCloseEndsLine,
  seasonDisplayName,
  seasonStatusLabel,
  type GroupSeasonStatus,
} from "@repo/domain/group-season";
import { useRouter } from "expo-router";
import { Lock, Plus } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api, type RouterOutputs } from "../trpc/react";
import { groupNewSeasonPath, groupPath } from "./groups-model";
import { Notice } from "./notice";

type Season = RouterOutputs["groups"]["listSeasons"]["seasons"][number];

function StatusTag({ status }: { status: GroupSeasonStatus }) {
  const locale = useLocale();
  const colors = useColors();
  const active = status === "active";
  return (
    <View
      style={{
        borderRadius: radii.slot,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderWidth: active ? 0 : hairline,
        borderColor: status === "upcoming" ? colors.ink : colors.rule,
        backgroundColor: active ? colors.control : undefined,
      }}
    >
      <Text
        size="eyebrow"
        weight="semibold"
        uppercase
        tone={status === "closed" ? "muted" : "default"}
        style={active ? { color: colors.onControl } : undefined}
      >
        {seasonStatusLabel(status, locale)}
      </Text>
    </View>
  );
}

function SeasonRow({ season }: { season: Season }) {
  const locale = useLocale();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: spacing.surface,
        paddingVertical: 14,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1}>
          {seasonDisplayName(season.name, locale)}
        </Text>
        <Text size="meta" tone="muted">
          {formatSeasonRange(season, locale)}
        </Text>
      </View>
      <StatusTag status={season.status} />
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
        paddingHorizontal: spacing.surface,
        paddingVertical: 10,
      }}
    >
      <Text size="meta" tone="muted">
        {label}
      </Text>
      <Text size="meta" style={{ flexShrink: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

function CloseSeasonSheet({
  season,
  groupId,
  visible,
  onClose,
}: {
  season: Season;
  groupId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const m = useMessages();
  const copy = m.mobileGroup.seasons.close;
  const locale = useLocale();
  const toast = useToast();
  const colors = useColors();
  const utils = api.useUtils();
  const standing = api.groups.seasonStanding.useQuery(
    { groupId, seasonId: season.id },
    { enabled: visible },
  );
  const group = api.groups.byId.useQuery({ id: groupId }, { enabled: visible });
  const closeSeason = api.groups.closeSeason.useMutation({
    onSuccess: async (closed) => {
      toast.show(seasonClosedToast(closed, locale));
      onClose();
      await Promise.all([
        utils.groups.listSeasons.invalidate({ groupId }),
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.seasonStanding.invalidate(),
        utils.groups.mine.invalidate(),
        utils.users.home.invalidate(),
      ]);
    },
    onError: (error) => toast.show(error.message),
  });
  const leader = standing.data?.rows.find((row) => row.ranked) ?? null;
  const details = [
    {
      label: copy.ends,
      value: seasonCloseEndsLine(season, new Date(), locale),
    },
    {
      label: copy.leader,
      value: leader
        ? copy.leaderValue(
            leader.name ?? m.mobileGroup.unnamedMember,
            leader.points,
          )
        : copy.nobodyRanked,
    },
    { label: copy.levels, value: copy.unchanged },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={closeSeasonTitle(season, locale)}
      subtitle={closeSeasonBody({
        gamesCounted: standing.data?.gamesCounted ?? 0,
        awaitingScoreCount: group.data?.standing.awaitingScoreCount ?? 0,
        locale,
      })}
      footer={
        <View style={{ gap: 8 }}>
          <Button
            label={copy.confirm}
            size="lg"
            pending={closeSeason.isPending}
            icon={<Lock size={sizes.iconRow} color={colors.onControl} />}
            onPress={() => closeSeason.mutate({ seasonId: season.id })}
          />
          <Button
            label={copy.keepOpen}
            size="lg"
            variant="outline"
            disabled={closeSeason.isPending}
            onPress={onClose}
          />
        </View>
      }
    >
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {details.map((row, index) => (
          <View key={row.label}>
            {index > 0 ? <Hairline /> : null}
            <DetailRow label={row.label} value={row.value} />
          </View>
        ))}
      </Surface>
    </Sheet>
  );
}

/** A Group's Seasons, and for its owner opening and closing one (web `/dashboard/groups/[id]/seasons`). */
export function SeasonsScreen({ groupId }: { groupId: string }) {
  const m = useMessages();
  const copy = m.mobileGroup.seasons;
  const locale = useLocale();
  const router = useRouter();
  const colors = useColors();
  const seasons = api.groups.listSeasons.useQuery(
    { groupId },
    { refetchOnWindowFocus: "always" },
  );
  const [closing, setClosing] = useState(false);
  const header = (
    <ScreenHeader nav="back" fallback={groupPath(groupId)} title={copy.title}>
      {seasons.data?.groupName ? (
        <Text size="meta" tone="muted" numberOfLines={1}>
          {seasons.data.groupName}
        </Text>
      ) : null}
    </ScreenHeader>
  );

  if (!seasons.data) {
    return (
      <Screen>
        {header}
        {seasons.error ? (
          <Notice
            alert
            title={copy.loadFailed}
            description={seasons.error.message}
            onRetry={() => void seasons.refetch()}
          />
        ) : (
          <>
            <Skeleton height={160} radius={16} />
            <Skeleton height={72} radius={16} />
          </>
        )}
      </Screen>
    );
  }

  const { canManage } = seasons.data;
  const active = seasons.data.seasons.find(
    (season) => season.status === "active",
  );

  return (
    <Screen
      refreshing={seasons.isRefetching}
      onRefresh={() => void seasons.refetch()}
    >
      {header}
      <Text tone="muted">{m.group.season.settingsIntro}</Text>
      <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
        {seasons.data.seasons.length > 0 ? (
          seasons.data.seasons.map((season, index) => (
            <View key={season.id}>
              {index > 0 ? <Hairline /> : null}
              <SeasonRow season={season} />
            </View>
          ))
        ) : (
          <Text size="meta" tone="muted" style={{ padding: spacing.surface }}>
            {copy.empty}
          </Text>
        )}
        {canManage ? (
          <>
            <Hairline />
            <View style={{ padding: 12 }}>
              <Button
                label={copy.newSeason}
                variant="outline"
                icon={<Plus size={sizes.iconRow} color={colors.ink} />}
                onPress={() => router.push(groupNewSeasonPath(groupId))}
              />
            </View>
          </>
        ) : null}
      </Surface>
      <Surface>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flexShrink: 1 }}>
            <Text weight="semibold">{copy.pointsPerGame}</Text>
            <Text size="meta" tone="muted">
              {copy.winDrawLoss}
            </Text>
          </View>
          <Text size="meta" mono>
            {`${SEASON_POINTS.win} / ${SEASON_POINTS.draw} / ${SEASON_POINTS.loss}`}
          </Text>
        </View>
      </Surface>
      {canManage && active ? (
        <>
          <Button
            label={closeSeasonActionLabel(active, locale)}
            size="lg"
            variant="outline"
            icon={<Lock size={sizes.iconRow} color={colors.ink} />}
            onPress={() => setClosing(true)}
          />
          <CloseSeasonSheet
            season={active}
            groupId={groupId}
            visible={closing}
            onClose={() => setClosing(false)}
          />
        </>
      ) : null}
    </Screen>
  );
}

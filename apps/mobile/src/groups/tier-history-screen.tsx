import { fishSizes } from "@repo/design-tokens/fish";
import { radii, sizes, spacing } from "@repo/design-tokens";
import { groupDisplayName } from "@repo/domain/group-join";
import {
  tierHistoryScreen,
  type RatingHistoryRow,
  type TierHistoryHeader,
} from "@repo/domain/rating-history";
import { useLocalSearchParams } from "expo-router";
import { PenLine } from "lucide-react-native";
import { useMemo } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { apiOrigin } from "../lib/api-origin-runtime";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { groupPath } from "./groups-model";
import { Notice } from "./notice";
import { TierFish } from "./tier-fish";

const PAGE_SIZE = 20;

function HeaderCard({
  header,
  imageUri,
}: {
  header: TierHistoryHeader;
  imageUri: string | null;
}) {
  const colors = useColors();
  const { width, height } = fishSizes.card;
  return (
    <View
      style={{
        gap: 16,
        paddingHorizontal: 20,
        paddingVertical: 18,
        borderRadius: radii.card,
        borderWidth: hairline,
        borderColor: colors.rule,
        backgroundColor: colors.wash,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Avatar name={header.name} uri={imageUri} size="lg" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text size="title" weight="bold" width="expanded" numberOfLines={1}>
            {header.name}
          </Text>
          <Text size="meta" tone="muted">
            {header.caption}
          </Text>
        </View>
      </View>
      {header.points != null ? (
        <>
          <Hairline />
          <View
            accessible
            accessibilityLabel={[
              header.standing,
              header.points,
              header.toNextBand,
            ]
              .filter(Boolean)
              .join(". ")}
            style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
          >
            {header.band && header.bandLabel ? (
              <TierFish
                band={header.band}
                label={header.bandLabel}
                size="card"
                cutout={colors.wash}
              />
            ) : header.provisional ? (
              <View style={{ width, height }}>
                <Hatch />
              </View>
            ) : null}
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              {header.standing ? (
                <Text size="eyebrow" tone="muted">
                  {header.standing}
                </Text>
              ) : null}
              <Text size="statTotal" weight="bold" width="expanded">
                {header.points}
              </Text>
            </View>
            {header.toNextBand ? (
              <Text
                size="eyebrow"
                tone="muted"
                style={{ flexShrink: 1, textAlign: "right" }}
              >
                {header.toNextBand}
              </Text>
            ) : null}
          </View>
        </>
      ) : null}
    </View>
  );
}

function HistoryRow({ row }: { row: RatingHistoryRow }) {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel={row.spoken}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="meta" weight="semibold">
          {row.title}
        </Text>
        <Text size="eyebrow" tone="muted">
          {row.detail}
        </Text>
        {row.byline ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 7,
              marginTop: 3,
            }}
          >
            <View style={{ paddingTop: 2 }}>
              <PenLine size={sizes.iconRow - 4} color={colors.muted} />
            </View>
            <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
              {row.byline}
            </Text>
          </View>
        ) : null}
      </View>
      <Text weight="bold" width="expanded">
        {row.delta}
      </Text>
    </View>
  );
}

/**
 * Points and history for one member of a tier Group: their fish,
 * place and points, then what moved them, manual changes with who and why.
 * The member themself and the Group's Organizers see the same list.
 */
export function TierHistoryScreen({
  groupId,
  userId,
}: {
  groupId: string;
  userId?: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const history = api.groups.tierHistory.useInfiniteQuery(
    { groupId, userId, limit: PAGE_SIZE },
    {
      refetchOnWindowFocus: "always",
      getNextPageParam: (page) => page.nextCursor ?? undefined,
    },
  );
  const first = history.data?.pages[0];
  const entries = useMemo(
    () => history.data?.pages.flatMap((page) => page.entries) ?? [],
    [history.data],
  );
  const header = (
    <ScreenHeader
      nav="back"
      fallback={groupPath(groupId)}
      title={m.rating.history.title}
    >
      {first ? (
        <Text size="meta" tone="muted" numberOfLines={1}>
          {groupDisplayName(first.group.name, locale)}
        </Text>
      ) : null}
    </ScreenHeader>
  );

  if (!first) {
    return (
      <Screen>
        {header}
        {history.error ? (
          <Notice
            alert
            title={m.rating.history.loadFailed}
            description={history.error.message}
            onRetry={() => void history.refetch()}
          />
        ) : (
          <>
            <Skeleton height={160} radius={16} />
            <Skeleton height={240} radius={16} />
          </>
        )}
      </Screen>
    );
  }

  const screen = tierHistoryScreen(
    { member: first.member, tier: first.tier, entries },
    first.viewerUserId,
    locale,
  );

  return (
    <Screen
      refreshing={history.isRefetching && !history.isFetchingNextPage}
      onRefresh={() => void history.refetch()}
    >
      {header}
      <HeaderCard
        header={screen.header}
        imageUri={mediaUrl(first.member.image, apiOrigin)}
      />
      <View style={{ gap: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="title" weight="semibold" accessibilityRole="header">
            {screen.listTitle}
          </Text>
          {screen.countLabel ? (
            <Text size="meta" tone="muted">
              {screen.countLabel}
            </Text>
          ) : null}
        </View>
        <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
          {screen.emptyText ? (
            <Text size="meta" tone="muted" style={{ padding: spacing.surface }}>
              {screen.emptyText}
            </Text>
          ) : (
            screen.rows.map((row, index) => (
              <View key={row.key}>
                {index > 0 ? <Hairline /> : null}
                <HistoryRow row={row} />
              </View>
            ))
          )}
          {history.hasNextPage ? (
            <>
              <Hairline />
              <View style={{ padding: 12, alignItems: "center" }}>
                <Button
                  label={m.common.showMore}
                  variant="outline"
                  pending={history.isFetchingNextPage}
                  onPress={() => void history.fetchNextPage()}
                />
              </View>
            </>
          ) : null}
        </Surface>
      </View>
      <Text size="eyebrow" tone="muted">
        {screen.footnote}
      </Text>
    </Screen>
  );
}

export function TierHistoryRoute() {
  const { groupId, userId } = useLocalSearchParams<{
    groupId: string;
    userId?: string;
  }>();
  return <TierHistoryScreen groupId={groupId} userId={userId} />;
}

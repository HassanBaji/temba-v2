import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { isCoinKind, type CoinKind } from "@repo/domain/marks";
import { isSport, type Sport } from "@repo/domain/sport";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import { gamePath } from "../games/games-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { playerMarksPath } from "../player-profile/player-path";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import {
  cabinetTab,
  markDetailModel,
  type MarkDetailModel,
  type MarkDetailRow,
} from "./cabinet-model";
import { MarkCoin } from "./mark-coin";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const ROW_MIN_HEIGHT = 56;

function DetailHead({ model }: { model: MarkDetailModel }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <MarkCoin kind={model.kind} size="sheet" />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            flexWrap: "wrap",
            columnGap: 10,
          }}
        >
          <Text
            size="h1"
            width="expanded"
            weight="bold"
            accessibilityRole="header"
          >
            {model.name}
          </Text>
          <Text size="figure" width="expanded" weight="bold" tone="muted" ltr>
            {model.count}
          </Text>
        </View>
        <Text size="meta" tone="muted">
          {model.description}
        </Text>
        {model.caption ? (
          <Text size="eyebrow" tone="muted">
            {model.caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function DetailRow({
  row,
  first,
  onOpenGame,
}: {
  row: MarkDetailRow;
  first: boolean;
  onOpenGame: (gameId: string) => void;
}) {
  const palette = useTonePalette();
  const content = (
    <>
      {row.giver ? (
        <Avatar name={row.giver.name} uri={row.giver.image} size="sm" />
      ) : (
        <MarkCoin kind="mvp" size="roster" />
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" numberOfLines={1}>
          <Text size="meta" weight="semibold">
            {row.title}
          </Text>
          {row.relation ? (
            <Text size="meta" tone="muted">{` ${row.relation}`}</Text>
          ) : null}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {row.sub}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        {row.score ? (
          <Text size="meta" weight="semibold" ltr>
            {row.score}
          </Text>
        ) : null}
        <Text size="eyebrow" tone="muted">
          {row.date}
        </Text>
      </View>
    </>
  );
  const style = {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: first ? 0 : hairline,
    borderColor: palette.rule,
  };
  if (!row.canOpenGame) {
    return (
      <View accessible accessibilityLabel={row.spoken} style={style}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.spoken}
      onPress={() => onOpenGame(row.gameId)}
      style={({ pressed }) => ({
        ...style,
        backgroundColor: pressed ? palette.wash : palette.background,
      })}
    >
      {content}
    </Pressable>
  );
}

/** Mark detail (3b): every Game one kind came from, on one sport's tab. */
export function MarkDetailScreen({
  userId,
  kind,
  requestedSport,
}: {
  userId: string;
  kind: CoinKind | null;
  requestedSport?: string;
}) {
  const router = useRouter();
  const segments = useSegments();
  const locale = useLocale();
  const m = useMessages();
  const [refreshing, setRefreshing] = useState(false);
  const cabinet = api.marks.cabinet.useQuery({ userId }, REFETCH_ON_FOREGROUND);
  const shown = cabinet.data && !cabinet.data.hidden ? cabinet.data : null;
  const sport: Sport | null = isSport(requestedSport)
    ? requestedSport
    : shown
      ? cabinetTab(shown, undefined)
      : null;
  const query = api.marks.kindDetail.useQuery(
    { userId, kind: kind ?? "mvp", sport: sport ?? "padel" },
    { ...REFETCH_ON_FOREGROUND, enabled: kind !== null && sport !== null },
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([query.refetch(), cabinet.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }, [query, cabinet]);

  const header = (
    <ScreenHeader
      nav="back"
      fallback={playerMarksPath(segments, userId, sport ?? undefined)}
    />
  );

  if (
    kind === null ||
    cabinet.data?.hidden ||
    isNotFoundError(query.error) ||
    isNotFoundError(cabinet.error)
  ) {
    return (
      <Screen>
        {header}
        <Notice
          title={m.mobileMarks.cabinet.unavailableTitle}
          description={m.mobileMarks.cabinet.unavailableDescription}
        />
      </Screen>
    );
  }

  if (query.error) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        {header}
        <Notice
          alert
          title={m.mobileMarks.cabinet.loadError}
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  if (!query.data) {
    return (
      <Screen>
        {header}
        <Skeleton height={80} radius={16} />
        <Skeleton height={200} radius={14} />
      </Screen>
    );
  }

  const model = markDetailModel(query.data, shown?.sports ?? [], locale);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {header}
      <DetailHead model={model} />
      {model.empty ? (
        <Text tone="muted">{model.empty}</Text>
      ) : (
        <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
          {model.rows.map((row, index) => (
            <DetailRow
              key={row.key}
              row={row}
              first={index === 0}
              onOpenGame={(gameId) => router.push(gamePath(gameId))}
            />
          ))}
        </Surface>
      )}
      {model.footer ? (
        <Text size="eyebrow" tone="muted">
          {model.footer}
        </Text>
      ) : null}
    </Screen>
  );
}

export function PlayerMarkRoute() {
  const { userId, kind, sport } = useLocalSearchParams<{
    userId: string;
    kind: string;
    sport?: string;
  }>();
  return (
    <MarkDetailScreen
      userId={userId}
      kind={isCoinKind(kind) ? kind : null}
      requestedSport={sport}
    />
  );
}

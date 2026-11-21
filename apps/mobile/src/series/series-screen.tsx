import { radii, sizes, typeScale } from "@repo/design-tokens";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { ArrowRight, EllipsisVertical } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { gamePath } from "../games/games-model";
import { groupPath, groupSeriesTabPath } from "../groups/groups-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { playerPath } from "../player-profile/player-path";
import { Avatar } from "../primitives/avatar";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { InitialsTile } from "../primitives/initials-tile";
import { Screen } from "../primitives/screen";
import {
  HeaderIconButton,
  ScreenHeader,
  useLeaveScreen,
} from "../primitives/screen-header";
import { Sheet } from "../primitives/sheet";
import { SheetMenu, SheetMenuRow } from "../primitives/sheet-menu";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { SectionHead } from "../profile/profile-parts";
import { api } from "../trpc/react";
import { SeriesBadge } from "./series-badge";
import {
  seriesScreenModel,
  type SeriesEditionRow,
  type SeriesFigure,
  type SeriesScreenData,
  type SeriesScreenExpanded,
  type SeriesScreenModel,
  type SeriesWinnerRow,
} from "./series-screen-model";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const MONOGRAM_SLOT = 34;
const EDITION_NUMBER_WIDTH = 22;
const GROUP_LINK_HIT_SLOP = (sizes.touchTarget - typeScale.meta.lineHeight) / 2;

function Figures({ figures }: { figures: SeriesFigure[] }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        borderTopWidth: hairline,
        borderColor: palette.rule,
        paddingTop: 14,
      }}
    >
      {figures.map((figure, index) => (
        <View
          key={figure.label}
          accessible
          style={{
            flex: 1,
            minWidth: 0,
            borderStartWidth: index > 0 ? hairline : 0,
            borderColor: palette.rule,
            paddingStart: index > 0 ? 16 : 0,
          }}
        >
          <Text size="h2" width="expanded" weight="bold" numberOfLines={1}>
            {figure.value}
          </Text>
          <Text size="eyebrow" tone="muted">
            {figure.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SeriesCard({
  series,
  figures,
  onOpenGroup,
}: {
  series: SeriesScreenData;
  figures: SeriesFigure[];
  onOpenGroup: () => void;
}) {
  return (
    <Surface tone="ink" style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <SeriesBadge
          emblem={series.emblem}
          colour={series.colour}
          size="page"
          surface="focus"
        />
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text
            size="h1"
            width="expanded"
            weight="bold"
            accessibilityRole="header"
          >
            {series.name}
          </Text>
          {series.group.name ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={series.group.name}
              hitSlop={GROUP_LINK_HIT_SLOP}
              onPress={onOpenGroup}
              style={({ pressed }) => ({
                alignSelf: "flex-start",
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text size="meta" tone="muted">
                {series.group.name}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <Figures figures={figures} />
    </Surface>
  );
}

function rowStyle(first: boolean, rule: string) {
  return {
    minHeight: sizes.touchTarget,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
    paddingHorizontal: 16,
    borderTopWidth: first ? 0 : hairline,
    borderColor: rule,
  };
}

/** A card of rows that folds to four, with "All N" expanding it in place. */
function FoldedList({
  more,
  onExpand,
  children,
}: {
  more: string | null;
  onExpand: () => void;
  children: React.ReactNode;
}) {
  const palette = useTonePalette();
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {children}
      {more ? (
        <Pressable
          accessibilityRole="button"
          onPress={onExpand}
          style={({ pressed }) => ({
            ...rowStyle(false, palette.rule),
            justifyContent: "space-between",
            paddingVertical: 12,
            backgroundColor: pressed ? palette.wash : palette.background,
          })}
        >
          <Text size="meta" weight="semibold">
            {more}
          </Text>
          <ArrowRight
            size={sizes.iconRow}
            color={palette.foreground}
            style={mirrorInRtl}
          />
        </Pressable>
      ) : null}
    </Surface>
  );
}

function WinnerRow({
  row,
  first,
  onOpen,
}: {
  row: SeriesWinnerRow;
  first: boolean;
  onOpen: (userId: string) => void;
}) {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.spoken}
      onPress={() => onOpen(row.userId)}
      style={({ pressed }) => ({
        ...rowStyle(first, palette.rule),
        paddingVertical: 11,
        backgroundColor:
          pressed || row.isViewer ? palette.wash : palette.background,
      })}
    >
      <View
        style={{
          width: MONOGRAM_SLOT,
          height: MONOGRAM_SLOT,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {row.isViewer ? (
          <InitialsTile name={row.name} uri={row.image} size="md" />
        ) : (
          <Avatar name={row.name} uri={row.image} radius={radii.md} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {row.line}
        </Text>
      </View>
      <Text size="figure" width="expanded" weight="bold" ltr>
        {row.wins}
      </Text>
    </Pressable>
  );
}

function HatchChip({ children }: { children: React.ReactNode }) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        maxWidth: "100%",
        backgroundColor: palette.background,
        borderRadius: radii.slot,
        paddingHorizontal: 5,
        paddingVertical: 1,
      }}
    >
      {children}
    </View>
  );
}

function EditionRow({
  row,
  first,
  onOpen,
}: {
  row: SeriesEditionRow;
  first: boolean;
  onOpen: (gameId: string) => void;
}) {
  const palette = useTonePalette();
  const line = (
    <Text weight="semibold" numberOfLines={1}>
      {row.line}
    </Text>
  );
  const date = (
    <Text size="eyebrow" tone="muted">
      {row.date}
    </Text>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.spoken}
      onPress={() => onOpen(row.gameId)}
      style={({ pressed }) => ({
        ...rowStyle(first, palette.rule),
        paddingVertical: 12,
        backgroundColor: pressed ? palette.wash : palette.background,
      })}
    >
      {row.hatched ? <Hatch radius={0} bordered={false} /> : null}
      <Text
        size="eyebrow"
        tone="muted"
        mono
        ltr
        style={{ minWidth: EDITION_NUMBER_WIDTH }}
      >
        {row.edition}
      </Text>
      <View style={{ flex: 1, minWidth: 0, alignItems: "flex-start" }}>
        {row.hatched ? <HatchChip>{line}</HatchChip> : line}
      </View>
      {row.hatched && row.date ? <HatchChip>{date}</HatchChip> : null}
      {!row.hatched && row.date ? date : null}
    </Pressable>
  );
}

function SeriesBody({
  series,
  model,
  onExpand,
  onOpenGroup,
  onOpenPlayer,
  onOpenGame,
}: {
  series: SeriesScreenData;
  model: SeriesScreenModel;
  onExpand: (list: keyof SeriesScreenExpanded) => void;
  onOpenGroup: () => void;
  onOpenPlayer: (userId: string) => void;
  onOpenGame: (gameId: string) => void;
}) {
  const m = useMessages();

  return (
    <>
      <SeriesCard
        series={series}
        figures={model.figures}
        onOpenGroup={onOpenGroup}
      />

      {model.mostWins ? (
        <View style={{ gap: 10 }}>
          <SectionHead
            title={m.series.page.mostWins}
            meta={model.mostWins.of}
          />
          <FoldedList
            more={model.mostWins.more}
            onExpand={() => onExpand("winners")}
          >
            {model.mostWins.rows.map((row, index) => (
              <WinnerRow
                key={row.userId}
                row={row}
                first={index === 0}
                onOpen={onOpenPlayer}
              />
            ))}
          </FoldedList>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <SectionHead
          title={m.series.page.editions}
          meta={model.editions ? m.series.page.newestFirst : undefined}
        />
        {model.editions ? (
          <FoldedList
            more={model.editions.more}
            onExpand={() => onExpand("editions")}
          >
            {model.editions.rows.map((row, index) => (
              <EditionRow
                key={row.gameId}
                row={row}
                first={index === 0}
                onOpen={onOpenGame}
              />
            ))}
          </FoldedList>
        ) : (
          <Surface radius="card">
            <Text size="meta" tone="muted">
              {model.empty}
            </Text>
          </Surface>
        )}
      </View>
    </>
  );
}

/** The Series page (3b): the badge and Group, Most wins, every Edition. */
export function SeriesScreen({ seriesId }: { seriesId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const segments = useSegments();
  const toast = useToast();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [expanded, setExpanded] = useState<SeriesScreenExpanded>({
    winners: false,
    editions: false,
  });
  const query = api.series.byId.useQuery(
    { id: seriesId },
    REFETCH_ON_FOREGROUND,
  );
  const series = query.data;
  const fallback = series ? groupPath(series.group.id) : "/groups";
  const leaveToSeriesTab = useLeaveScreen(
    series ? groupSeriesTabPath(series.group.id) : "/groups",
  );

  const endSeries = api.series.end.useMutation({
    onSuccess: async (result) => {
      const groupLists = series ? { groupId: series.group.id } : undefined;
      if ("deleted" in result) {
        void utils.series.listForGroup.invalidate(groupLists);
        leaveToSeriesTab();
        return;
      }
      await Promise.all([
        utils.series.byId.invalidate({ id: seriesId }),
        utils.series.listForGroup.invalidate(groupLists),
      ]);
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const title = m.series.page.title;

  if (isNotFoundError(query.error)) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title={title} />
        <Notice title={m.series.errors.notFound} />
      </Screen>
    );
  }

  if (query.error && !series) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <ScreenHeader nav="back" fallback={fallback} title={title} />
        <Notice
          alert
          title={m.series.page.loadError}
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  if (!series) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title={title} />
        <Skeleton height={200} radius={radii.surface} />
        <Skeleton height={240} radius={radii.card} />
        <Skeleton height={200} radius={radii.card} />
      </Screen>
    );
  }

  const model = seriesScreenModel(series, expanded, locale);
  const end = model.end;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader
        nav="back"
        fallback={fallback}
        title={title}
        actions={
          end ? (
            <HeaderIconButton
              framed
              icon={EllipsisVertical}
              accessibilityLabel={m.series.page.actions}
              onPress={() => setMenuOpen(true)}
            />
          ) : null
        }
      />
      <SeriesBody
        series={series}
        model={model}
        onExpand={(list) =>
          setExpanded((current) => ({ ...current, [list]: true }))
        }
        onOpenGroup={() => router.push(groupPath(series.group.id))}
        onOpenPlayer={(userId) => router.push(playerPath(segments, userId))}
        onOpenGame={(gameId) => router.push(gamePath(gameId))}
      />

      {end ? (
        <Sheet
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          title={series.name}
          titleSize="lead"
          closeButton
        >
          <SheetMenu>
            {[
              <SheetMenuRow
                key="end"
                label={end.confirm}
                tone="danger"
                onPress={() => {
                  setMenuOpen(false);
                  setConfirm({
                    title: end.title,
                    description: end.description,
                    confirmLabel: end.confirm,
                    onConfirm: () => endSeries.mutate({ id: seriesId }),
                  });
                }}
              />,
            ]}
          </SheetMenu>
        </Sheet>
      ) : null}
      <ConfirmSheet
        request={confirm}
        pending={endSeries.isPending}
        onClose={() => setConfirm(null)}
      />
    </Screen>
  );
}

export function SeriesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SeriesScreen seriesId={id} />;
}

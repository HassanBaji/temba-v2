import { radii, sizes, typeScale } from "@repo/design-tokens";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import {
  ArrowRight,
  ChevronRight,
  EllipsisVertical,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { gamePath } from "../games/games-model";
import { groupPath, groupSeriesPath } from "../groups/groups-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { playerPath } from "../player-profile/player-path";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
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
  seriesEndConfirmation,
  seriesScreenModel,
  type SeriesEditionRow,
  type SeriesFigure,
  type SeriesHolders,
  type SeriesNextCard,
  type SeriesPerson,
  type SeriesScreenData,
  type SeriesScreenExpanded,
  type SeriesWinnerRow,
  type SeriesYouCard,
} from "./series-screen-model";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const RANK_WIDTH = 16;
const EDITION_NUMBER_WIDTH = 26;
const NEXT_BLOCK_WIDTH = 62;
const SINCE_WIDTH = 64;
const SQUARE_OVERLAP = -5;
const GROUP_LINK_HIT_SLOP = (sizes.touchTarget - typeScale.meta.lineHeight) / 2;

type SquareSize = "md" | "xs";

const AVATAR_SIZE = { md: "default", xs: "sm" } as const;
const SQUARE_SLOT = { md: 34, xs: 28 } as const;

/** A player's photo, or their initials; solid for the viewer. */
function PersonSquare({
  person,
  size,
  onFocus = false,
}: {
  person: SeriesPerson;
  size: SquareSize;
  onFocus?: boolean;
}) {
  return (
    <View
      style={{
        width: SQUARE_SLOT[size],
        height: SQUARE_SLOT[size],
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {person.isViewer ? (
        <InitialsTile
          name={person.name}
          uri={person.image}
          size={size}
          tone={onFocus ? "inverse" : "ink"}
        />
      ) : (
        <Avatar
          name={person.name}
          uri={person.image}
          size={AVATAR_SIZE[size]}
          radius={size === "md" ? radii.md : radii.sm}
        />
      )}
    </View>
  );
}

function Squares({
  people,
  size,
  onFocus,
}: {
  people: SeriesPerson[];
  size: SquareSize;
  onFocus?: boolean;
}) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row" }}
    >
      {people.map((person, index) => (
        <View
          key={person.key}
          style={{ marginStart: index > 0 ? SQUARE_OVERLAP : 0 }}
        >
          <PersonSquare person={person} size={size} onFocus={onFocus} />
        </View>
      ))}
    </View>
  );
}

/** One small Series badge per win, up to three, then the count alone. */
function WinTally({
  emblem,
  colour,
  badges,
  wins,
}: {
  emblem: SeriesEmblem;
  colour: SeriesColour;
  badges: number;
  wins: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      {Array.from({ length: badges }, (_, index) => (
        <SeriesBadge key={index} emblem={emblem} colour={colour} size="tally" />
      ))}
      <Text
        size="title"
        width="expanded"
        weight="bold"
        ltr
        style={{ marginStart: 5 }}
      >
        {wins}
      </Text>
    </View>
  );
}

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
            paddingStart: index > 0 ? 14 : 0,
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

function HoldersRow({ holders }: { holders: SeriesHolders }) {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View
      accessible
      accessibilityLabel={holders.spoken}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderTopWidth: hairline,
        borderColor: palette.rule,
        paddingTop: 14,
      }}
    >
      <Squares people={holders.people} size="md" onFocus />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="eyebrow" tone="muted">
          {m.series.page.holders}
        </Text>
        {holders.names.map((name, index) => (
          <Text key={`${index}-${name}`} weight="semibold">
            {name}
          </Text>
        ))}
      </View>
      <Text
        size="eyebrow"
        tone="muted"
        style={{ width: SINCE_WIDTH, textAlign: "right" }}
      >
        {holders.since}
      </Text>
    </View>
  );
}

function SeriesCard({
  series,
  holders,
  figures,
  onOpenGroup,
}: {
  series: SeriesScreenData;
  holders: SeriesHolders | null;
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
      {holders ? <HoldersRow holders={holders} /> : null}
      <Figures figures={figures} />
    </Surface>
  );
}

function HatchLabel({
  radius,
  children,
}: {
  radius: number;
  children: React.ReactNode;
}) {
  const palette = useTonePalette();
  return (
    <View
      style={{
        backgroundColor: palette.background,
        borderRadius: radius,
        paddingHorizontal: 5,
      }}
    >
      {children}
    </View>
  );
}

function NextEditionCard({
  next,
  onOpen,
}: {
  next: SeriesNextCard;
  onOpen: (gameId: string) => void;
}) {
  const palette = useTonePalette();
  return (
    <Surface
      padded={false}
      radius="card"
      style={{ overflow: "hidden", flexDirection: "row" }}
    >
      <View
        style={{
          width: NEXT_BLOCK_WIDTH,
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          borderEndWidth: hairline,
          borderColor: palette.rule,
        }}
      >
        <Hatch radius={0} bordered={false} />
        <HatchLabel radius={radii.slot}>
          <Text size="eyebrow" tone="muted">
            {next.editionWord}
          </Text>
        </HatchLabel>
        <HatchLabel radius={radii.sm}>
          <Text size="figure" width="expanded" weight="bold" ltr>
            {next.edition}
          </Text>
        </HatchLabel>
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          paddingHorizontal: 14,
          paddingVertical: 13,
        }}
      >
        <Text weight="semibold">{next.title}</Text>
        <Text size="eyebrow" tone="muted">
          {next.line}
        </Text>
      </View>
      <View style={{ justifyContent: "center", paddingEnd: 12 }}>
        <Button
          label={next.action}
          variant="ink"
          size="sm"
          onPress={() => onOpen(next.gameId)}
        />
      </View>
    </Surface>
  );
}

function YouInSeries({
  you,
  emblem,
  colour,
}: {
  you: SeriesYouCard;
  emblem: SeriesEmblem;
  colour: SeriesColour;
}) {
  return (
    <Surface radius="card" padded={false}>
      <View
        accessible
        accessibilityLabel={you.spoken}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 13,
        }}
      >
        <PersonSquare person={you.person} size="md" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold">{you.title}</Text>
          <Text size="eyebrow" tone="muted">
            {you.line}
          </Text>
        </View>
        <WinTally
          emblem={emblem}
          colour={colour}
          badges={you.badges}
          wins={you.wins}
        />
      </View>
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
  emblem,
  colour,
  onOpen,
}: {
  row: SeriesWinnerRow;
  first: boolean;
  emblem: SeriesEmblem;
  colour: SeriesColour;
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
      <Text size="eyebrow" tone="muted" mono ltr style={{ width: RANK_WIDTH }}>
        {row.rank}
      </Text>
      <PersonSquare person={row.person} size="md" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold" numberOfLines={1}>
          {row.name}
        </Text>
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {row.line}
        </Text>
      </View>
      <WinTally
        emblem={emblem}
        colour={colour}
        badges={row.badges}
        wins={row.wins}
      />
    </Pressable>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.spoken}
      onPress={() => onOpen(row.gameId)}
      style={({ pressed }) => ({
        ...rowStyle(first, palette.rule),
        paddingVertical: 12,
        paddingEnd: 14,
        backgroundColor: pressed ? palette.wash : palette.background,
      })}
    >
      <Text
        size="lead"
        width="expanded"
        weight="bold"
        ltr
        style={{ width: EDITION_NUMBER_WIDTH }}
      >
        {row.edition}
      </Text>
      {row.people.length > 0 ? <Squares people={row.people} size="xs" /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {row.names.map((name, index) => (
          <Text key={`${index}-${name}`} weight="semibold" numberOfLines={1}>
            {name}
          </Text>
        ))}
        {row.meta ? (
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {row.meta}
          </Text>
        ) : null}
      </View>
      <ChevronRight
        size={sizes.iconRow}
        color={palette.muted}
        style={mirrorInRtl}
      />
    </Pressable>
  );
}

/**
 * The Series screen (design 05) for the data of `series.byId`: the holders,
 * the next Edition, the viewer's line, Winners and the decided Editions.
 */
export function SeriesScreenView({
  series,
  now,
  onOpenGroup,
  onOpenPlayer,
  onOpenGame,
}: {
  series: SeriesScreenData;
  now?: Date;
  onOpenGroup: () => void;
  onOpenPlayer: (userId: string) => void;
  onOpenGame: (gameId: string) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const [expanded, setExpanded] = useState<SeriesScreenExpanded>({
    winners: false,
    editions: false,
  });
  const model = seriesScreenModel(series, expanded, locale, now);
  const expand = (list: keyof SeriesScreenExpanded) =>
    setExpanded((current) => ({ ...current, [list]: true }));

  return (
    <>
      <SeriesCard
        series={series}
        holders={model.holders}
        figures={model.figures}
        onOpenGroup={onOpenGroup}
      />

      <View style={{ gap: 8 }}>
        {model.next ? (
          <NextEditionCard next={model.next} onOpen={onOpenGame} />
        ) : null}
        <YouInSeries
          you={model.you}
          emblem={series.emblem}
          colour={series.colour}
        />
      </View>

      {model.winners ? (
        <View style={{ gap: 10 }}>
          <SectionHead
            title={m.series.page.winners}
            meta={model.winners.meta}
          />
          <FoldedList
            more={model.winners.more}
            onExpand={() => expand("winners")}
          >
            {model.winners.rows.map((row, index) => (
              <WinnerRow
                key={row.userId}
                row={row}
                first={index === 0}
                emblem={series.emblem}
                colour={series.colour}
                onOpen={onOpenPlayer}
              />
            ))}
          </FoldedList>
        </View>
      ) : null}

      {model.editions ? (
        <View style={{ gap: 10 }}>
          <SectionHead
            title={m.series.page.editions}
            meta={model.editions.meta}
          />
          <FoldedList
            more={model.editions.more}
            onExpand={() => expand("editions")}
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
        </View>
      ) : null}

      {model.empty ? (
        <View style={{ gap: 10 }}>
          <SectionHead title={m.series.page.editions} />
          <Surface radius="card">
            <Text size="meta" tone="muted">
              {model.empty}
            </Text>
          </Surface>
        </View>
      ) : null}
    </>
  );
}

/** The Series screen: loads `series.byId` and ends the Series from its menu. */
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
  const query = api.series.byId.useQuery(
    { id: seriesId },
    REFETCH_ON_FOREGROUND,
  );
  const series = query.data;
  const fallback = series ? groupPath(series.group.id) : "/groups";
  const leaveToGroupSeries = useLeaveScreen(
    series ? groupSeriesPath(series.group.id) : "/groups",
  );

  const endSeries = api.series.end.useMutation({
    onSuccess: async (result) => {
      const groupLists = series ? { groupId: series.group.id } : undefined;
      const groupById = series ? { id: series.group.id } : undefined;
      if ("deleted" in result) {
        void utils.series.listForGroup.invalidate(groupLists);
        void utils.groups.byId.invalidate(groupById);
        leaveToGroupSeries();
        return;
      }
      await Promise.all([
        utils.series.byId.invalidate({ id: seriesId }),
        utils.series.listForGroup.invalidate(groupLists),
        utils.groups.byId.invalidate(groupById),
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

  const end = seriesEndConfirmation(series, locale);

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
      <SeriesScreenView
        series={series}
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

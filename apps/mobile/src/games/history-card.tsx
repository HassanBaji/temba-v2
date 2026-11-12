import { radii } from "@repo/design-tokens";
import type { HubHistoryRow } from "@repo/domain/hub-game-row";
import {
  matchHistoryCardModel,
  PENDING_SET_COLUMNS,
  type HistoryTeamRow,
} from "@repo/domain/match-history-card";
import { markName, type CoinKind } from "@repo/domain/marks";
import { resultMarkLabel } from "@repo/domain/result-mark";
import {
  albumStripTiles,
  albumSummaryLine,
  type GameAlbumSummary,
} from "@repo/domain/game-album";
import { ArrowRight, Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
import { CachedImage } from "../primitives/cached-image";
import { CoinStack } from "../marks/coin-stack";
import { Avatar } from "../primitives/avatar";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { ResultMark } from "../primitives/result-mark";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { ScoreLine } from "../primitives/score-pair";
import { Text } from "../primitives/text";

const INSET = 16;
const AVATAR_RING = 2;
const AVATAR_OVERLAP = 8;
const SCORE_MIN_WIDTH = 22;

function AvatarStack({ team }: { team: HistoryTeamRow }) {
  const palette = useTonePalette();

  if (team.avatars.length === 0) {
    return (
      <View style={{ width: 28, height: 28 }}>
        <Hatch radius={14} />
      </View>
    );
  }

  return (
    <View style={{ flexDirection: "row", paddingStart: AVATAR_OVERLAP }}>
      {team.avatars.map((member) => (
        <View
          key={member.id}
          style={{
            marginStart: -AVATAR_OVERLAP,
            borderRadius: 14,
            borderWidth: AVATAR_RING,
            borderColor: palette.background,
          }}
        >
          <Avatar name={member.name} uri={member.image} size="sm" />
        </View>
      ))}
    </View>
  );
}

function TeamScores({ team }: { team: HistoryTeamRow }) {
  if (!team.scores) {
    return (
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: PENDING_SET_COLUMNS }, (_, index) => (
          <View key={index} style={{ width: 22, height: 22 }}>
            <Hatch radius={radii.sm} />
          </View>
        ))}
      </View>
    );
  }

  const sets = team.scores.length > 1;

  return (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
      {team.scores.map((score, index) => (
        <Text
          key={index}
          size={sets ? "title" : "h2"}
          width="expanded"
          weight="bold"
          tone={score.lostSet ? "muted" : "default"}
          style={{ minWidth: SCORE_MIN_WIDTH, textAlign: "right" }}
        >
          {score.games}
        </Text>
      ))}
    </View>
  );
}

function TeamRow({ team }: { team: HistoryTeamRow }) {
  return (
    <View
      accessible
      accessibilityLabel={[
        team.label,
        team.note,
        team.scores?.map((score) => score.games).join(", "),
      ]
        .filter(Boolean)
        .join(". ")}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
      }}
    >
      <AvatarStack team={team} />
      <View
        style={{ flex: 1, minWidth: 0 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text
          numberOfLines={1}
          weight={team.side === "mine" ? "semibold" : "regular"}
          tone={team.lost ? "muted" : "default"}
        >
          {team.label}
        </Text>
        <Text size="eyebrow" tone="muted">
          {team.note}
        </Text>
      </View>
      <TeamScores team={team} />
    </View>
  );
}

function ResultStrip({
  outcome,
  scoreLine,
  coins,
  day,
}: {
  outcome: HubHistoryRow["outcome"];
  scoreLine: string;
  coins: CoinKind[];
  day: string;
}) {
  const locale = useLocale();
  const palette = useTonePalette();

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: INSET,
        paddingVertical: 12,
        backgroundColor: outcome === "won" ? palette.background : palette.wash,
      }}
    >
      <ResultMark variant={outcome} size={16} decorative />
      <Text weight="semibold">{resultMarkLabel(outcome, locale)}</Text>
      <ScoreLine score={scoreLine} size="meta" tone="muted" />
      <CoinStack kinds={coins} size="row" />
      <Text
        size="eyebrow"
        tone="muted"
        numberOfLines={1}
        style={{ marginStart: "auto" }}
      >
        {day}
      </Text>
    </View>
  );
}

const STRIP_GAP = 4;

/** Six small tiles when the Game has photos, hatched where empty; then the counts and where to go. */
function AlbumFooter({
  album,
  onOpen,
  onAddPhotos,
}: {
  album: GameAlbumSummary;
  onOpen: () => void;
  onAddPhotos?: () => void;
}) {
  const locale = useLocale();
  const palette = useTonePalette();
  const m = useMessages().gameAlbum.played;
  const withPhotos = album.photoCount > 0;
  return (
    <View style={{ paddingHorizontal: INSET, paddingBottom: 12, gap: 10 }}>
      {withPhotos ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", gap: STRIP_GAP }}
        >
          {albumStripTiles(album).map((tile, index) => (
            <View
              key={index}
              style={{
                flex: 1,
                aspectRatio: 1,
                borderRadius: radii.sm,
                overflow: "hidden",
              }}
            >
              {tile.kind === "photo" ? (
                <CachedImage
                  uri={tile.url}
                  contentFit="cover"
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <Hatch radius={radii.sm} />
              )}
            </View>
          ))}
        </View>
      ) : null}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          size="eyebrow"
          tone="muted"
          numberOfLines={1}
          style={{ flexShrink: 1 }}
        >
          {albumSummaryLine(album, locale)}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={withPhotos || !onAddPhotos ? onOpen : onAddPhotos}
          hitSlop={10}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text size="eyebrow" weight="semibold">
            {withPhotos || !onAddPhotos ? m.open : m.addPhotos}
          </Text>
          {withPhotos || !onAddPhotos ? (
            <ArrowRight
              size={12}
              color={palette.foreground}
              style={mirrorInRtl}
            />
          ) : (
            <Plus size={12} color={palette.foreground} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function HistoryCard({
  row,
  onOpen,
  onAddPhotos,
}: {
  row: HubHistoryRow;
  onOpen: (gameId: string) => void;
  /** Opens the Game with the Add photos sheet up. */
  onAddPhotos?: (gameId: string) => void;
}) {
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.mobileTournament.history;
  const palette = useTonePalette();
  const model = matchHistoryCardModel(row, locale);
  const won = model.outcome === "won";
  const card = m.accessibleName(
    resultMarkLabel(model.outcome, locale),
    model.scoreLine,
    model.meta,
  );
  const accessibilityLabel =
    model.coins.length > 0
      ? messages.mobileMarks.sentences([
          card,
          messages.mobileMarks.history.coinsSpoken(
            model.coins
              .map((kind) => markName(kind, locale))
              .join(messages.common.listSeparator),
          ),
        ])
      : card;

  return (
    <View
      style={{
        borderRadius: radii.surface,
        borderWidth: hairline,
        borderColor: won ? palette.foreground : palette.rule,
        backgroundColor: palette.background,
        overflow: "hidden",
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={() => onOpen(row.id)}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <SurfaceToneContext.Provider value={won ? "ink" : "paper"}>
          <ResultStrip
            outcome={model.outcome}
            scoreLine={model.scoreLine}
            coins={model.coins}
            day={model.day}
          />
        </SurfaceToneContext.Provider>

        {model.sport || model.groupName ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingHorizontal: INSET,
              paddingTop: 10,
            }}
          >
            {model.sport ? (
              <View
                style={{
                  borderWidth: hairline,
                  borderColor: palette.rule,
                  borderRadius: radii.slot,
                  paddingHorizontal: 7,
                  paddingVertical: 3,
                }}
              >
                <Text size="eyebrow" tone="muted" mono uppercase>
                  {model.sport}
                </Text>
              </View>
            ) : null}
            {model.groupName ? (
              <Text
                size="eyebrow"
                tone="muted"
                mono
                uppercase
                numberOfLines={1}
                style={{ flexShrink: 1, marginStart: "auto" }}
              >
                {model.groupName}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={{ paddingHorizontal: INSET, paddingTop: 4 }}>
          <TeamRow team={model.teams[0]} />
          <Hairline />
          <TeamRow team={model.teams[1]} />
        </View>

        <Hairline />
        <View
          style={{
            paddingHorizontal: INSET,
            paddingTop: 10,
            paddingBottom: 12,
          }}
        >
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {model.place}
          </Text>
        </View>
        {row.album ? (
          <AlbumFooter
            album={row.album}
            onOpen={() => onOpen(row.id)}
            onAddPhotos={onAddPhotos ? () => onAddPhotos(row.id) : undefined}
          />
        ) : null}
      </Pressable>
    </View>
  );
}

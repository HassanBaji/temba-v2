import { invertedFocusPalettes } from "@repo/design-tokens";
import {
  draftListLayout,
  fitDraftPlayers,
  type DraftCardPlayer,
  type DraftCardSide,
  type DraftListLayout,
  type DraftRowSize,
  type DraftShareCard,
} from "@repo/domain/football-draft-share";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { STORY_HEIGHT, STORY_WIDTH } from "../share-result/story-canvas";
import {
  BibSquare,
  Big,
  InkCanvas,
  Label,
  Wordmark,
} from "../share-result/story-parts";

// Share cards render on black in both modes: they leave the App.
const colors = invertedFocusPalettes.light;

const PAD_X = 72;
const PAD_TOP = 180;
const PAD_BOTTOM = 160;
const FRAME_GAP = 64;
const RULE = 1;
const COLUMN_GAP = 24;
const HALF_WIDTH = (STORY_WIDTH - 2 * PAD_X - COLUMN_GAP) / 2;

function DraftFrame({ children }: { children: React.ReactNode }) {
  return (
    <InkCanvas
      style={{
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        backgroundColor: colors.ink,
        paddingHorizontal: PAD_X,
        paddingTop: PAD_TOP,
        paddingBottom: PAD_BOTTOM,
        gap: FRAME_GAP,
      }}
    >
      {children}
    </InkCanvas>
  );
}

function DraftHead({ typeLine }: { typeLine: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
      }}
    >
      <Wordmark mark={56} px={40} />
      <Label px={26} tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
        {typeLine}
      </Label>
    </View>
  );
}

function DraftFoot({ card }: { card: DraftShareCard }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 24,
        marginTop: "auto",
      }}
    >
      <View style={{ flexShrink: 1, gap: 8 }}>
        <Big px={40} weight="semibold" numberOfLines={1}>
          {card.venue}
        </Big>
        {card.when ? (
          <Big px={30} tone="muted">
            {card.when}
          </Big>
        ) : null}
      </View>
      <View
        style={{
          borderWidth: 3,
          borderColor: colors.muted,
          borderRadius: 14,
          paddingVertical: 8,
          paddingHorizontal: 18,
        }}
      >
        <Label px={26} tracking={0.1} style={{ color: colors.paper }}>
          {card.stamp}
        </Label>
      </View>
    </View>
  );
}

function CaptainMark({ size }: { size: DraftRowSize }) {
  const m = useMessages().football.captains;
  return (
    <View
      accessibilityLabel={m.spoken}
      style={{
        width: size.badge,
        height: size.badge,
        borderRadius: Math.round(size.badge / 4.5),
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.paper,
      }}
    >
      <Big px={size.badgeText} weight="semibold" style={{ color: colors.ink }}>
        {m.badge}
      </Big>
    </View>
  );
}

function PlayerRow({
  player,
  size,
  width,
}: {
  player: DraftCardPlayer;
  size: DraftRowSize;
  width: number | "100%";
}) {
  return (
    <View
      style={{
        width,
        flexDirection: "row",
        alignItems: "center",
        gap: 18,
        paddingVertical: size.padY,
        paddingStart: 8,
        paddingEnd: 16,
      }}
    >
      <View
        style={{
          width: size.tile,
          height: size.tile,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: colors.paper,
        }}
      >
        <Big px={size.init} weight="semibold">
          {player.init}
        </Big>
      </View>
      <Big
        px={size.name}
        weight="semibold"
        numberOfLines={1}
        style={{ flex: 1, minWidth: 0 }}
      >
        {player.name}
      </Big>
      {player.captain ? <CaptainMark size={size} /> : null}
      <Label
        px={size.code}
        tracking={0.08}
        style={{
          width: size.codeWidth,
          textAlign: "right",
          color: colors.onControlMuted,
        }}
      >
        {player.code ?? ""}
      </Label>
    </View>
  );
}

function MoreRow({
  count,
  size,
  width,
}: {
  count: number;
  size: DraftRowSize;
  width: number | "100%";
}) {
  const m = useMessages().football.draftShare;
  return (
    <View
      style={{
        width,
        minHeight: size.tile + 2 * size.padY,
        justifyContent: "center",
        paddingStart: 8,
      }}
    >
      <Label px={size.code} style={{ color: colors.onControlMuted }}>
        {m.andMore(count)}
      </Label>
    </View>
  );
}

function PlayerGrid({
  players,
  listLayout,
}: {
  players: readonly DraftCardPlayer[];
  listLayout: DraftListLayout;
}) {
  const { size, columns, rows, spread } = listLayout;
  const { shown, more } = fitDraftPlayers(players, columns * rows);
  const width = columns === 2 ? HALF_WIDTH : "100%";
  return (
    <View
      style={
        columns === 2
          ? {
              flexDirection: "row",
              flexWrap: "wrap",
              columnGap: COLUMN_GAP,
              rowGap: size.rowGap,
            }
          : {
              flex: spread ? 1 : undefined,
              justifyContent: spread ? "space-evenly" : undefined,
            }
      }
    >
      {shown.map((player) => (
        <PlayerRow
          key={player.userId}
          player={player}
          size={size}
          width={width}
        />
      ))}
      {more > 0 ? <MoreRow count={more} size={size} width={width} /> : null}
    </View>
  );
}

function SideHeadRow({ side }: { side: DraftCardSide }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 36,
        paddingBottom: 36,
        borderBottomWidth: RULE,
        borderBottomColor: colors.controlRule,
      }}
    >
      <View
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 18,
        }}
      >
        <BibSquare bib={side.bib} size={40} radius={10} />
        <View style={{ flexShrink: 1, gap: 6 }}>
          <Big
            px={72}
            ratio={1}
            tracking={-0.03}
            width="expanded"
            weight="bold"
            numberOfLines={1}
          >
            {side.name}
          </Big>
          <Label
            px={26}
            numberOfLines={1}
            style={{ color: colors.onControlMuted }}
          >
            {side.captainLine}
          </Label>
        </View>
      </View>
      <Label
        px={26}
        style={{ alignSelf: "flex-end", color: colors.onControlMuted }}
      >
        {side.countLine}
      </Label>
    </View>
  );
}

function BothTeamsCard({ card }: { card: DraftShareCard }) {
  const listLayout = draftListLayout(card);
  return (
    <DraftFrame>
      <DraftHead typeLine={card.typeLine} />
      {card.sides.map((side, index) => (
        <View key={side.slot} style={index > 0 ? { marginTop: -28 } : null}>
          <SideHeadRow side={side} />
        </View>
      ))}
      <View
        style={{
          flex: 1,
          minHeight: 0,
          justifyContent: "space-evenly",
          gap: 40,
        }}
      >
        {card.sides.map((side) => (
          <View key={side.slot} style={{ gap: 16 }}>
            <Label
              px={26}
              tracking={0.14}
              style={{ color: colors.onControlMuted }}
            >
              {side.listLabel}
            </Label>
            <PlayerGrid players={side.players} listLayout={listLayout} />
          </View>
        ))}
      </View>
      <DraftFoot card={card} />
    </DraftFrame>
  );
}

function OneTeamCard({
  card,
  side,
}: {
  card: DraftShareCard;
  side: DraftCardSide;
}) {
  const m = useMessages().football.draftShare;
  return (
    <DraftFrame>
      <DraftHead typeLine={card.typeLine} />
      <View
        style={{
          gap: 32,
          paddingBottom: 46,
          borderBottomWidth: RULE,
          borderBottomColor: colors.controlRule,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
          <BibSquare bib={side.bib} size={56} radius={14} />
          <Big
            px={136}
            ratio={0.95}
            tracking={-0.04}
            width="expanded"
            weight="bold"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {side.name}
          </Big>
        </View>
        <Label
          px={26}
          numberOfLines={1}
          style={{ color: colors.onControlMuted }}
        >
          {m.sideLine(side.captainLine, side.countLine)}
        </Label>
      </View>
      <View style={{ flex: 1, minHeight: 0, justifyContent: "space-evenly" }}>
        <PlayerGrid players={side.players} listLayout={draftListLayout(card)} />
      </View>
      {card.against ? (
        <Big px={32} style={{ color: colors.onControlMuted }}>
          {card.against}
        </Big>
      ) : null}
      <DraftFoot card={card} />
    </DraftFrame>
  );
}

/**
 * A 1080 × 1920 Draft card on ink (ADR-0107): both teams (design 3b) or one
 * team for that team's chat (3c). Names, positions and the C only.
 */
export function DraftStoryCard({ card }: { card: DraftShareCard }) {
  const [only] = card.sides;
  if (card.mode !== "both" && only) {
    return <OneTeamCard card={card} side={only} />;
  }
  return <BothTeamsCard card={card} />;
}

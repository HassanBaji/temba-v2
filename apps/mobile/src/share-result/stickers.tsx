import { palettes } from "@repo/design-tokens";
import {
  padelStickerLine,
  type FootballResultCard,
  type PadelResultCard,
  type ResultCard,
} from "@repo/domain/game-result-share";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import {
  Big,
  BibSquare,
  InitialsSquare,
  InkCanvas,
  Label,
  Wordmark,
} from "./story-parts";
import { STICKER_WIDTH } from "./story-canvas";

// Share cards render on black in both modes: they leave the App.
const colors = palettes.light;

const RULE = 1;

/** The black card itself; the canvas around it stays transparent. */
function StickerFrame({
  typeLine,
  children,
}: {
  typeLine: string;
  children: React.ReactNode;
}) {
  return (
    <InkCanvas style={{ width: STICKER_WIDTH }}>
      <View
        style={{
          backgroundColor: colors.ink,
          borderRadius: 32,
          paddingVertical: 40,
          paddingHorizontal: 44,
          gap: 28,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <Wordmark mark={40} px={28} />
          <Label
            px={20}
            tone="muted"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {typeLine}
          </Label>
        </View>
        {children}
      </View>
    </InkCanvas>
  );
}

function StickerFoot({
  children,
  whenShort,
}: {
  children: React.ReactNode;
  whenShort: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        paddingTop: 24,
        borderTopWidth: RULE,
        borderTopColor: colors.dimrule,
      }}
    >
      {children}
      {whenShort ? (
        <Big px={24} tone="muted" style={{ textAlign: "right" }}>
          {whenShort}
        </Big>
      ) : null}
    </View>
  );
}

function FootballSticker({ card }: { card: FootballResultCard }) {
  const m = useMessages();
  const tag = m.game.played.tag;
  const side = (
    team: FootballResultCard["win"],
    word: string,
    strong: boolean,
    align: "left" | "right",
  ) => (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        gap: 10,
        alignItems: align === "right" ? "flex-end" : "flex-start",
      }}
    >
      <BibSquare bib={team.bib} size={28} radius={8} />
      <Big
        px={34}
        weight={strong ? "semibold" : "regular"}
        numberOfLines={1}
        style={{ color: strong ? colors.paper : colors.dim, textAlign: align }}
      >
        {team.name}
      </Big>
      <Label
        px={20}
        tracking={0.14}
        style={{ color: strong ? colors.dim : colors.muted }}
      >
        {word}
      </Label>
    </View>
  );
  return (
    <StickerFrame typeLine={card.typeLine}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
        {side(card.win, card.draw ? tag.draw : tag.won, true, "left")}
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 16 }}>
          <Big
            px={150}
            ratio={0.86}
            tracking={-0.05}
            width="expanded"
            weight="bold"
          >
            {String(card.win.score)}
          </Big>
          <Big px={60} ratio={0.86} style={{ color: colors.muted }}>
            –
          </Big>
          <Big
            px={150}
            ratio={0.86}
            tracking={-0.05}
            width="expanded"
            weight="bold"
            style={{ color: card.draw ? colors.paper : colors.muted }}
          >
            {String(card.lose.score)}
          </Big>
        </View>
        {side(card.lose, card.draw ? tag.draw : tag.lost, card.draw, "right")}
      </View>
      <StickerFoot whenShort={card.whenShort}>
        {card.you ? (
          <View
            style={{
              flex: 1,
              minWidth: 0,
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
            }}
          >
            <InitialsSquare
              init={card.you.init}
              size={52}
              radius={14}
              px={18}
              variant="solid"
            />
            <View style={{ flexShrink: 1, gap: 4 }}>
              <Big px={28} weight="semibold" numberOfLines={1}>
                {card.you.name}
              </Big>
              <Label px={20} tone="muted">
                {[m.mobilePlayer.share.goals(card.you.goals), card.you.code]
                  .filter(Boolean)
                  .join(" · ")}
              </Label>
            </View>
          </View>
        ) : (
          <Label px={20} tone="muted" style={{ flex: 1 }}>
            {card.typeNote}
          </Label>
        )}
      </StickerFoot>
    </StickerFrame>
  );
}

function PadelSticker({ card }: { card: PadelResultCard }) {
  const locale = useLocale();
  const pair = (short: string, line: string, strong: boolean) => (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <InitialsSquare
        init={short}
        size={52}
        radius={14}
        px={18}
        variant={strong ? "solid" : "outline-muted"}
      />
      <Big
        px={34}
        weight={strong ? "semibold" : "regular"}
        numberOfLines={1}
        style={{ flexShrink: 1, color: strong ? colors.paper : colors.dim }}
      >
        {line}
      </Big>
    </View>
  );
  const cells = (pick: "w" | "l") => (
    <View style={{ flexDirection: "row", gap: 22 }}>
      {card.setRows.map((row) => {
        const value = pick === "w" ? row.w : row.l;
        const won = pick === "w" ? row.w > row.l : row.l > row.w;
        return (
          <Big
            key={row.id}
            px={92}
            ratio={0.9}
            tracking={-0.05}
            width="expanded"
            weight="bold"
            style={{
              width: 90,
              textAlign: "center",
              color: won ? colors.paper : colors.muted,
            }}
          >
            {String(value)}
          </Big>
        );
      })}
    </View>
  );
  return (
    <StickerFrame typeLine={card.typeLine}>
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
          {pair(card.winnerShort, card.winnerLine, true)}
          {cells("w")}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
          {pair(card.loserShort, card.loserLine, card.draw)}
          {cells("l")}
        </View>
      </View>
      <StickerFoot whenShort={card.whenShort}>
        <Label px={20} tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {padelStickerLine(card, locale)}
        </Label>
      </StickerFoot>
    </StickerFrame>
  );
}

/** A compact result on a transparent canvas, to drop on a photo. */
export function Sticker({ card }: { card: ResultCard }) {
  return card.kind === "padel" ? (
    <PadelSticker card={card} />
  ) : (
    <FootballSticker card={card} />
  );
}

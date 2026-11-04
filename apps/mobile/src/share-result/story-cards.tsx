import { colors } from "@repo/design-tokens";
import type {
  FootballResultCard,
  PadelResultCard,
  ResultCard,
  ResultCardPerson,
} from "@repo/domain/game-result-share";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import {
  Big,
  BibSquare,
  InitialsSquare,
  InkCanvas,
  Label,
  Wordmark,
} from "./story-parts";
import { STORY_HEIGHT, STORY_WIDTH } from "./story-canvas";

const PAD_X = 72;
const PAD_TOP = 180;
const PAD_BOTTOM = 160;
const RULE = 1;
const MAX_SCORERS = 5;
const MAX_LINEUP = 6;

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <InkCanvas
      style={{
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        backgroundColor: colors.ink,
        paddingHorizontal: PAD_X,
        paddingTop: PAD_TOP,
        paddingBottom: PAD_BOTTOM,
        gap: 64,
      }}
    >
      {children}
    </InkCanvas>
  );
}

function StoryHead({ typeLine }: { typeLine: string }) {
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
      <Label px={22} tone="muted" numberOfLines={1} style={{ flexShrink: 1 }}>
        {typeLine}
      </Label>
    </View>
  );
}

function StoryFoot({ card }: { card: ResultCard }) {
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
      <Label px={24} style={{ color: colors.muted }}>
        {card.typeNote}
      </Label>
    </View>
  );
}

function PadelSide({
  word,
  people,
  count,
  strong,
}: {
  word: string;
  people: ResultCardPerson[];
  count: number;
  strong: boolean;
}) {
  const ink = strong ? colors.paper : colors.dim;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 40,
        paddingBottom: 36,
        borderBottomWidth: RULE,
        borderBottomColor: colors.dimrule,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 14 }}>
        <Label
          px={26}
          tracking={0.14}
          style={{ color: strong ? colors.dim : colors.muted }}
        >
          {word}
        </Label>
        {people.map((person) => (
          <View
            key={person.userId}
            style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
          >
            <InitialsSquare
              init={person.init}
              size={64}
              radius={16}
              px={22}
              variant={strong ? "solid" : "outline-muted"}
            />
            <Big
              px={40}
              weight={strong ? "semibold" : "regular"}
              numberOfLines={1}
              style={{ color: ink, flexShrink: 1 }}
            >
              {person.name}
            </Big>
          </View>
        ))}
      </View>
      <Big
        px={200}
        ratio={0.86}
        tracking={-0.05}
        width="expanded"
        weight="bold"
        style={{ color: ink }}
      >
        {String(count)}
      </Big>
    </View>
  );
}

function PadelStory({ card }: { card: PadelResultCard }) {
  const m = useMessages();
  const tag = m.game.played.tag;
  return (
    <StoryFrame>
      <StoryHead typeLine={card.typeLine} />
      <View style={{ flex: 1, justifyContent: "center", gap: 56 }}>
        <PadelSide
          word={card.draw ? tag.draw : tag.won}
          people={card.winners}
          count={card.winCount}
          strong
        />
        <View style={{ marginTop: -20 }}>
          <PadelSide
            word={card.draw ? tag.draw : tag.lost}
            people={card.losers}
            count={card.loseCount}
            strong={false}
          />
        </View>
        <View style={{ gap: 18 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 28,
              paddingBottom: 12,
              gap: 24,
            }}
          >
            <Label
              px={26}
              tracking={0.14}
              style={{ flex: 1, color: colors.muted }}
            >
              {m.mobilePlayer.share.sets}
            </Label>
            <Label
              px={24}
              tone="muted"
              style={{ width: 160, textAlign: "center" }}
            >
              {card.winnerShort}
            </Label>
            <Label
              px={24}
              style={{ width: 160, textAlign: "center", color: colors.muted }}
            >
              {card.loserShort}
            </Label>
          </View>
          {card.setRows.map((row) => (
            <View
              key={row.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 24,
                paddingVertical: 22,
                paddingHorizontal: 28,
                borderRadius: 20,
                backgroundColor: colors.raised,
              }}
            >
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <Label px={28} tracking={0.14}>
                  {row.label}
                </Label>
                <Label px={22} tone="muted">
                  {row.note}
                </Label>
              </View>
              <Big
                px={84}
                ratio={1}
                tracking={-0.04}
                width="expanded"
                weight="bold"
                style={{
                  width: 160,
                  textAlign: "center",
                  color: row.w > row.l ? colors.paper : colors.muted,
                }}
              >
                {String(row.w)}
              </Big>
              <Big
                px={84}
                ratio={1}
                tracking={-0.04}
                width="expanded"
                weight="bold"
                style={{
                  width: 160,
                  textAlign: "center",
                  color: row.l > row.w ? colors.paper : colors.muted,
                }}
              >
                {String(row.l)}
              </Big>
            </View>
          ))}
        </View>
      </View>
      <StoryFoot card={card} />
    </StoryFrame>
  );
}

function FootballScoreRow({
  side,
  word,
  strong,
}: {
  side: FootballResultCard["win"];
  word: string;
  strong: boolean;
}) {
  const ink = strong ? colors.paper : colors.dim;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 36,
        paddingBottom: 36,
        borderBottomWidth: RULE,
        borderBottomColor: colors.dimrule,
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
        <View style={{ flexShrink: 1, gap: 4 }}>
          <Big
            px={52}
            weight={strong ? "semibold" : "regular"}
            numberOfLines={1}
            style={{ color: ink }}
          >
            {side.name}
          </Big>
          <Label
            px={20}
            tracking={0.14}
            style={{ color: strong ? colors.dim : colors.muted }}
          >
            {word}
          </Label>
        </View>
      </View>
      <Big
        px={220}
        ratio={0.86}
        tracking={-0.05}
        width="expanded"
        weight="bold"
        style={{ color: strong ? colors.paper : colors.muted }}
      >
        {String(side.score)}
      </Big>
    </View>
  );
}

function ScorerSheet({ card }: { card: FootballResultCard }) {
  const m = useMessages().mobilePlayer.share;
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "space-evenly",
        gap: 16,
        marginTop: -8,
      }}
    >
      <Label
        px={26}
        tracking={0.14}
        style={{ color: colors.muted, paddingBottom: 6 }}
      >
        {m.scorers}
      </Label>
      {card.scorers.slice(0, MAX_SCORERS).map((scorer) => {
        const ink = scorer.isYou
          ? colors.ink
          : scorer.onWinningSide
            ? colors.paper
            : colors.dim;
        const sub = scorer.isYou ? colors.muted : colors.dim;
        return (
          <View
            key={scorer.userId}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 24,
              paddingVertical: 26,
              paddingHorizontal: 28,
              borderRadius: 20,
              backgroundColor: scorer.isYou ? colors.paper : "transparent",
            }}
          >
            <BibSquare bib={scorer.bib} size={18} radius={5} />
            <Big
              px={40}
              weight="semibold"
              numberOfLines={1}
              style={{ flex: 1, minWidth: 0, color: ink }}
            >
              {scorer.name}
            </Big>
            {scorer.isYou ? (
              <Label px={26} style={{ color: sub }}>
                {m.you}
              </Label>
            ) : null}
            <Big
              px={64}
              ratio={1}
              tracking={-0.04}
              width="expanded"
              weight="bold"
              style={{ width: 72, textAlign: "right", color: ink }}
            >
              {String(scorer.goals)}
            </Big>
          </View>
        );
      })}
    </View>
  );
}

function LineupGrid({
  word,
  people,
  strong,
}: {
  word: string;
  people: ResultCardPerson[];
  strong: boolean;
}) {
  const m = useMessages().mobilePlayer.share;
  const itemWidth = (STORY_WIDTH - 2 * PAD_X - 24) / 2;
  return (
    <View style={{ gap: 16 }}>
      <Label
        px={26}
        tracking={0.14}
        style={{ color: strong ? colors.dim : colors.muted, paddingBottom: 4 }}
      >
        {word}
      </Label>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          columnGap: 24,
          rowGap: 16,
        }}
      >
        {people.slice(0, MAX_LINEUP).map((person) => {
          const you = strong && person.isYou;
          const ink = you ? colors.ink : strong ? colors.paper : colors.dim;
          return (
            <View
              key={person.userId}
              style={{
                width: itemWidth,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                paddingVertical: 10,
                paddingStart: 10,
                paddingEnd: 16,
                borderRadius: 18,
                backgroundColor: you ? colors.paper : "transparent",
              }}
            >
              <View
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 2,
                  borderColor: you
                    ? colors.ink
                    : strong
                      ? colors.paper
                      : colors.muted,
                }}
              >
                <Big px={20} weight="semibold" style={{ color: ink }}>
                  {person.init}
                </Big>
              </View>
              <Big
                px={30}
                weight={strong ? "semibold" : "regular"}
                numberOfLines={1}
                style={{ flex: 1, minWidth: 0, color: ink }}
              >
                {person.name}
              </Big>
              {you ? (
                <Label px={20} style={{ color: colors.muted }}>
                  {m.you}
                </Label>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FootballStory({ card }: { card: FootballResultCard }) {
  const tag = useMessages().game.played.tag;
  const winWord = card.draw ? tag.draw : tag.won;
  const loseWord = card.draw ? tag.draw : tag.lost;
  return (
    <StoryFrame>
      <StoryHead typeLine={card.typeLine} />
      <FootballScoreRow side={card.win} word={winWord} strong />
      <View style={{ marginTop: -28 }}>
        <FootballScoreRow side={card.lose} word={loseWord} strong={card.draw} />
      </View>
      {card.scorers.length > 0 ? (
        <ScorerSheet card={card} />
      ) : (
        <View
          style={{
            flex: 1,
            justifyContent: "space-evenly",
            gap: 48,
            marginTop: -8,
          }}
        >
          <LineupGrid
            word={card.win.name.toUpperCase()}
            people={card.lineups.win}
            strong
          />
          <LineupGrid
            word={card.lose.name.toUpperCase()}
            people={card.lineups.lose}
            strong={card.draw}
          />
        </View>
      )}
      <StoryFoot card={card} />
    </StoryFrame>
  );
}

/** A 1080 × 1920 result card on black, sized for a story. */
export function StoryCard({ card }: { card: ResultCard }) {
  return card.kind === "padel" ? (
    <PadelStory card={card} />
  ) : (
    <FootballStory card={card} />
  );
}

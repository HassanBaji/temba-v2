"use client";

import { colors } from "@repo/design-tokens";
import type {
  FootballResultCard,
  PadelResultCard,
  ResultCard,
  ResultCardMvp,
  ResultCardPerson,
} from "@repo/domain/game-result-share";

import { useMessages } from "~/components/locale-provider";
import { MarkCoin } from "~/components/marks/mark-coin";

import { STORY_HEIGHT, STORY_WIDTH } from "./scaled-canvas";
import { Big, BibSquare, InitialsSquare, Label, Wordmark } from "./story-parts";

const PAD_X = 72;
const PAD_TOP = 180;
const PAD_BOTTOM = 160;
const MAX_SCORERS = 5;
const MAX_LINEUP = 6;
const FRAME_GAP = 64;
// The MVP line takes a row of its own; a tighter rhythm keeps five scorers
// or two full lineups on the canvas.
const FRAME_GAP_WITH_MVP = 48;

function StoryFrame({
  card,
  children,
}: {
  card: ResultCard;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-ink text-paper flex flex-col"
      style={{
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`,
        gap: card.mvp ? FRAME_GAP_WITH_MVP : FRAME_GAP,
      }}
    >
      {children}
    </div>
  );
}

function StoryHead({ typeLine }: { typeLine: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <Wordmark mark={56} px={40} />
      <Label px={22} className="text-dim shrink-0 whitespace-nowrap">
        {typeLine}
      </Label>
    </div>
  );
}

function StoryMvp({ mvp }: { mvp: ResultCardMvp | null }) {
  const m = useMessages().webMarks;
  if (!mvp) {
    return null;
  }
  return (
    <div data-slot="story-mvp" className="flex items-center gap-6">
      <MarkCoin kind="mvp" size="sheet" />
      <Big px={40} className="min-w-0 shrink truncate font-semibold">
        {m.mvp.title(mvp.name)}
      </Big>
      <Big px={30} className="text-dim min-w-0 shrink-[2] truncate">
        {mvp.decidedBy}
      </Big>
    </div>
  );
}

function StoryFoot({ card }: { card: ResultCard }) {
  return (
    <div className="mt-auto flex items-end justify-between gap-6">
      <div className="min-w-0 space-y-2">
        <Big px={40} className="truncate font-semibold">
          {card.venue}
        </Big>
        {card.when ? (
          <Big px={30} className="text-dim">
            {card.when}
          </Big>
        ) : null}
      </div>
      <Label px={24} className="text-muted-foreground shrink-0">
        {card.typeNote}
      </Label>
    </div>
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
    <div
      className="border-dimrule flex items-center gap-10 border-b"
      style={{ paddingBottom: 36 }}
    >
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 14 }}>
        <Label
          px={26}
          tracking={0.14}
          className={strong ? "text-dim" : "text-muted-foreground"}
        >
          {word}
        </Label>
        {people.map((person) => (
          <div key={person.userId} className="flex items-center gap-4">
            <InitialsSquare
              init={person.init}
              size={64}
              radius={16}
              px={22}
              variant={strong ? "solid" : "outline-muted"}
            />
            <Big
              px={40}
              className={strong ? "truncate font-semibold" : "truncate"}
            >
              <span style={{ color: ink }}>{person.name}</span>
            </Big>
          </div>
        ))}
      </div>
      <Big px={200} ratio={0.86} tracking={-0.05} expanded>
        <span style={{ color: ink }}>{count}</span>
      </Big>
    </div>
  );
}

function PadelStory({ card }: { card: PadelResultCard }) {
  const tag = useMessages().game.played.tag;
  return (
    <StoryFrame card={card}>
      <StoryHead typeLine={card.typeLine} />
      <div className="flex flex-1 flex-col justify-center" style={{ gap: 56 }}>
        <PadelSide
          word={card.draw ? tag.draw : tag.won}
          people={card.winners}
          count={card.winCount}
          strong
        />
        <div style={{ marginTop: -20 }}>
          <PadelSide
            word={card.draw ? tag.draw : tag.lost}
            people={card.losers}
            count={card.loseCount}
            strong={false}
          />
        </div>
        <div className="flex flex-col" style={{ gap: 18 }}>
          <div
            className="flex items-center gap-6"
            style={{ padding: "0 28px 12px" }}
          >
            <Label
              px={26}
              tracking={0.14}
              className="text-muted-foreground flex-1"
            >
              SETS
            </Label>
            <Label px={24} className="text-dim w-[160px] text-center">
              {card.winnerShort}
            </Label>
            <Label
              px={24}
              className="text-muted-foreground w-[160px] text-center"
            >
              {card.loserShort}
            </Label>
          </div>
          {card.setRows.map((row) => (
            <div
              key={row.id}
              className="bg-raised flex items-center gap-6"
              style={{ padding: "22px 28px", borderRadius: 20 }}
            >
              <div className="flex flex-1 items-center gap-4">
                <Label px={28} tracking={0.14}>
                  {row.label}
                </Label>
                <Label px={22} className="text-dim">
                  {row.note}
                </Label>
              </div>
              <Big
                px={84}
                ratio={1}
                tracking={-0.04}
                expanded
                className="w-[160px] text-center"
              >
                <span
                  style={{ color: row.w > row.l ? colors.paper : colors.muted }}
                >
                  {row.w}
                </span>
              </Big>
              <Big
                px={84}
                ratio={1}
                tracking={-0.04}
                expanded
                className="w-[160px] text-center"
              >
                <span
                  style={{ color: row.l > row.w ? colors.paper : colors.muted }}
                >
                  {row.l}
                </span>
              </Big>
            </div>
          ))}
        </div>
      </div>
      <StoryMvp mvp={card.mvp} />
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
    <div
      className="border-dimrule flex items-center gap-9 border-b"
      style={{ paddingBottom: 36 }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-[18px]">
        <BibSquare bib={side.bib} size={40} radius={10} />
        <div className="min-w-0 space-y-1">
          <Big
            px={52}
            className={strong ? "truncate font-semibold" : "truncate"}
          >
            <span style={{ color: ink }}>{side.name}</span>
          </Big>
          <Label
            px={20}
            tracking={0.14}
            className={strong ? "text-dim" : "text-muted-foreground"}
          >
            {word}
          </Label>
        </div>
      </div>
      <Big px={220} ratio={0.86} tracking={-0.05} expanded>
        <span style={{ color: strong ? colors.paper : colors.muted }}>
          {side.score}
        </span>
      </Big>
    </div>
  );
}

function ScorerSheet({ card }: { card: FootballResultCard }) {
  return (
    <div
      className="flex flex-1 flex-col justify-evenly"
      style={{ gap: 16, marginTop: -8 }}
    >
      <Label px={26} tracking={0.14} className="text-muted-foreground pb-1.5">
        SCORERS
      </Label>
      {card.scorers.slice(0, MAX_SCORERS).map((scorer) => {
        const ink = scorer.isYou
          ? colors.ink
          : scorer.onWinningSide
            ? colors.paper
            : colors.dim;
        return (
          <div
            key={scorer.userId}
            className="flex items-center gap-6"
            style={{
              padding: "26px 28px",
              borderRadius: 20,
              backgroundColor: scorer.isYou ? colors.paper : "transparent",
              color: ink,
            }}
          >
            <BibSquare bib={scorer.bib} size={18} radius={5} />
            <Big px={40} className="min-w-0 flex-1 truncate font-semibold">
              {scorer.name}
            </Big>
            {scorer.isYou ? (
              <Label px={26} className="text-muted-foreground">
                YOU
              </Label>
            ) : null}
            <Big
              px={64}
              ratio={1}
              tracking={-0.04}
              expanded
              className="w-[72px] text-end"
            >
              {scorer.goals}
            </Big>
          </div>
        );
      })}
    </div>
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
  const itemWidth = (STORY_WIDTH - 2 * PAD_X - 24) / 2;
  return (
    <div className="flex flex-col" style={{ gap: 16 }}>
      <Label
        px={26}
        tracking={0.14}
        className={strong ? "text-dim pb-1" : "text-muted-foreground pb-1"}
      >
        {word}
      </Label>
      <div className="flex flex-wrap" style={{ columnGap: 24, rowGap: 16 }}>
        {people.slice(0, MAX_LINEUP).map((person) => {
          const you = strong && person.isYou;
          const ink = you ? colors.ink : strong ? colors.paper : colors.dim;
          return (
            <div
              key={person.userId}
              className="flex items-center gap-4"
              style={{
                width: itemWidth,
                padding: "10px 16px 10px 10px",
                borderRadius: 18,
                backgroundColor: you ? colors.paper : "transparent",
                color: ink,
              }}
            >
              <span
                className="flex shrink-0 items-center justify-center font-semibold"
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: 14,
                  fontSize: 20,
                  border: `2px solid ${you ? colors.ink : strong ? colors.paper : colors.muted}`,
                }}
              >
                {person.init}
              </span>
              <Big
                px={30}
                className={
                  strong
                    ? "min-w-0 flex-1 truncate font-semibold"
                    : "min-w-0 flex-1 truncate"
                }
              >
                {person.name}
              </Big>
              {you ? (
                <Label px={20} className="text-muted-foreground">
                  YOU
                </Label>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FootballStory({ card }: { card: FootballResultCard }) {
  const tag = useMessages().game.played.tag;
  return (
    <StoryFrame card={card}>
      <StoryHead typeLine={card.typeLine} />
      <FootballScoreRow
        side={card.win}
        word={card.draw ? tag.draw : tag.won}
        strong
      />
      <div style={{ marginTop: -28 }}>
        <FootballScoreRow
          side={card.lose}
          word={card.draw ? tag.draw : tag.lost}
          strong={card.draw}
        />
      </div>
      {card.scorers.length > 0 ? (
        <ScorerSheet card={card} />
      ) : (
        <div
          className="flex flex-1 flex-col justify-evenly"
          style={{ gap: 48, marginTop: -8 }}
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
        </div>
      )}
      <StoryMvp mvp={card.mvp} />
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

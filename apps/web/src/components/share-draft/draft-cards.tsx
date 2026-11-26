"use client";

import { colors } from "@repo/design-tokens";
import {
  draftListLayout,
  fitDraftPlayers,
  type DraftCardPlayer,
  type DraftCardSide,
  type DraftListLayout,
  type DraftRowSize,
  type DraftShareCard,
} from "@repo/domain/football-draft-share";

import { useMessages } from "~/components/locale-provider";
import {
  STORY_HEIGHT,
  STORY_WIDTH,
} from "~/components/share-result/scaled-canvas";
import {
  BibSquare,
  Big,
  InitialsSquare,
  Label,
  Wordmark,
} from "~/components/share-result/story-parts";

const PAD_X = 72;
const PAD_TOP = 180;
const PAD_BOTTOM = 160;
const FRAME_GAP = 64;
const COLUMN_GAP = 24;
const HALF_WIDTH = (STORY_WIDTH - 2 * PAD_X - COLUMN_GAP) / 2;

// Draft cards render on black in both modes, so they keep the light palette.
function DraftFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="light bg-ink text-paper flex flex-col"
      style={{
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        padding: `${PAD_TOP}px ${PAD_X}px ${PAD_BOTTOM}px`,
        gap: FRAME_GAP,
      }}
    >
      {children}
    </div>
  );
}

function DraftHead({ typeLine }: { typeLine: string }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <Wordmark mark={56} px={40} />
      <Label px={26} className="text-on-control-muted min-w-0 truncate">
        {typeLine}
      </Label>
    </div>
  );
}

function DraftFoot({ card }: { card: DraftShareCard }) {
  return (
    <div className="mt-auto flex items-end justify-between gap-6">
      <div className="min-w-0 space-y-2">
        <Big px={40} className="truncate font-semibold">
          <span dir="auto">{card.venue}</span>
        </Big>
        {card.when ? (
          <Big px={30} className="text-on-control-muted">
            {card.when}
          </Big>
        ) : null}
      </div>
      <span
        className="shrink-0"
        style={{
          border: `3px solid ${colors.muted}`,
          borderRadius: 14,
          padding: "8px 18px",
        }}
      >
        <Label px={26} tracking={0.1} className="whitespace-nowrap">
          {card.stamp}
        </Label>
      </span>
    </div>
  );
}

function CaptainMark({ size }: { size: DraftRowSize }) {
  const m = useMessages().football.captains;
  return (
    <span
      role="img"
      aria-label={m.spoken}
      className="flex shrink-0 items-center justify-center font-semibold"
      style={{
        width: size.badge,
        height: size.badge,
        borderRadius: Math.round(size.badge / 4.5),
        backgroundColor: colors.paper,
        color: colors.ink,
        fontSize: size.badgeText,
        lineHeight: 1,
      }}
    >
      {m.badge}
    </span>
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
    <div
      className="flex items-center"
      style={{
        width,
        gap: 18,
        paddingBlock: size.padY,
        paddingInlineStart: 8,
        paddingInlineEnd: 16,
      }}
    >
      <InitialsSquare
        init={player.init}
        size={size.tile}
        radius={14}
        px={size.init}
        variant="outline"
      />
      <Big px={size.name} className="min-w-0 flex-1 truncate font-semibold">
        <span dir="auto">{player.name}</span>
      </Big>
      {player.captain ? <CaptainMark size={size} /> : null}
      <span className="shrink-0" style={{ width: size.codeWidth }}>
        <Label
          px={size.code}
          tracking={0.08}
          className="text-on-control-muted text-end"
        >
          {player.code ?? ""}
        </Label>
      </span>
    </div>
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
    <div
      className="flex flex-col justify-center"
      style={{
        width,
        minHeight: size.tile + 2 * size.padY,
        paddingInlineStart: 8,
      }}
    >
      <Label px={size.code} className="text-on-control-muted">
        {m.andMore(count)}
      </Label>
    </div>
  );
}

function PlayerGrid({
  players,
  layout,
}: {
  players: readonly DraftCardPlayer[];
  layout: DraftListLayout;
}) {
  const { size, columns, rows, spread } = layout;
  const { shown, more } = fitDraftPlayers(players, columns * rows);
  const width = columns === 2 ? HALF_WIDTH : "100%";
  return (
    <div
      data-slot="draft-list"
      className={
        columns === 2
          ? "flex flex-wrap"
          : spread
            ? "flex flex-1 flex-col justify-evenly"
            : "flex flex-col"
      }
      style={
        columns === 2 ? { columnGap: COLUMN_GAP, rowGap: size.rowGap } : {}
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
    </div>
  );
}

function SideHeadRow({ side }: { side: DraftCardSide }) {
  return (
    <div
      className="border-control-rule flex items-center gap-9 border-b"
      style={{ paddingBottom: 36 }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-[18px]">
        <BibSquare bib={side.bib} size={40} radius={10} />
        <div className="min-w-0 space-y-1.5">
          <Big
            px={72}
            ratio={1}
            tracking={-0.03}
            expanded
            className="truncate font-bold"
          >
            {side.name}
          </Big>
          <Label px={26} className="text-on-control-muted truncate">
            {side.captainLine}
          </Label>
        </div>
      </div>
      <Label px={26} className="text-on-control-muted shrink-0 self-end">
        {side.countLine}
      </Label>
    </div>
  );
}

function BothTeamsCard({ card }: { card: DraftShareCard }) {
  const layout = draftListLayout(card);
  return (
    <DraftFrame>
      <DraftHead typeLine={card.typeLine} />
      {card.sides.map((side, index) => (
        <div key={side.slot} style={index > 0 ? { marginTop: -28 } : {}}>
          <SideHeadRow side={side} />
        </div>
      ))}
      <div
        className="flex min-h-0 flex-1 flex-col justify-evenly"
        style={{ gap: 40 }}
      >
        {card.sides.map((side) => (
          <div key={side.slot} className="flex flex-col" style={{ gap: 16 }}>
            <Label px={26} tracking={0.14} className="text-on-control-muted">
              {side.listLabel}
            </Label>
            <PlayerGrid players={side.players} layout={layout} />
          </div>
        ))}
      </div>
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
      <div
        className="border-control-rule flex flex-col border-b"
        style={{ gap: 32, paddingBottom: 46 }}
      >
        <div className="flex items-center" style={{ gap: 28 }}>
          <BibSquare bib={side.bib} size={56} radius={14} />
          <Big
            px={136}
            ratio={0.95}
            tracking={-0.04}
            expanded
            className="min-w-0 truncate font-bold"
          >
            {side.name}
          </Big>
        </div>
        <Label px={26} className="text-on-control-muted truncate">
          {m.sideLine(side.captainLine, side.countLine)}
        </Label>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-evenly">
        <PlayerGrid players={side.players} layout={draftListLayout(card)} />
      </div>
      {card.against ? (
        <Big px={32} className="text-on-control-muted">
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

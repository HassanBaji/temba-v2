"use client";

import { colors } from "@repo/design-tokens";
import { initials } from "@repo/domain/initials";
import type { ResultMarkVariant } from "@repo/domain/result-mark";
import type {
  TournamentPlacingCard,
  TournamentShareCard as TournamentShareCardModel,
  TournamentTableCard,
} from "@repo/domain/tournament-finished";

import { Big, InitialsSquare, Label, StoryMark, Wordmark } from "./story-parts";

export const TOURNAMENT_CARD_SIZE = 1080;

const PAD = 72;
const DOT = 92;
const ARC = "M6,50 C18,16 82,16 94,50";

/**
 * The result mark reversed for ink, glyph for glyph with `ResultMark`: solid
 * for a win, an outline for a loss, the outline struck through for a draw,
 * and a faint outline when the Match was not played.
 */
function ResultDot({ result }: { result: ResultMarkVariant }) {
  if (result === "won") {
    return <StoryMark size={DOT} />;
  }
  const edge = result === "not-played" ? colors.muted : colors.paper;
  return (
    <svg
      viewBox="0 0 100 100"
      width={DOT}
      height={DOT}
      aria-hidden="true"
      className="block shrink-0"
    >
      <circle
        cx="50"
        cy="50"
        r="43"
        fill="none"
        stroke={edge}
        strokeWidth="5"
      />
      <path d={ARC} fill="none" stroke={edge} strokeWidth="5" />
      {result === "draw" ? (
        <path d="M81,19 L19,81" fill="none" stroke={edge} strokeWidth="5" />
      ) : null}
    </svg>
  );
}

function CardHead({ card }: { card: TournamentShareCardModel }) {
  return (
    <>
      <div className="flex items-center justify-between gap-6">
        <Wordmark mark={56} px={40} />
        <Label
          px={24}
          className="text-on-control-muted shrink-0 whitespace-nowrap rounded-[10px] border-2 px-[18px] py-[10px] uppercase"
        >
          {card.tag}
        </Label>
      </div>
      <Big px={38} ratio={1.25} className="text-on-control-muted mt-[64px]">
        {card.eyebrow}
      </Big>
    </>
  );
}

function PlacingBody({ card }: { card: TournamentPlacingCard }) {
  return (
    <>
      <div className="mt-[8px] flex items-baseline gap-[28px]">
        <Big px={300} ratio={0.95} tracking={-0.05} expanded>
          {card.placing}
        </Big>
        <Big px={52} ratio={1.1} className="text-on-control-muted">
          {card.placingNote}
        </Big>
      </div>
      <div className="mt-[40px] flex items-center gap-[32px]">
        <InitialsSquare
          init={initials(card.markName)}
          size={120}
          radius={22}
          px={40}
          variant="solid"
        />
        <div className="min-w-0">
          <Big px={52} ratio={1.15} className="font-semibold" tracking={-0.01}>
            <span dir="auto">{card.team}</span>
          </Big>
          {card.record ? (
            <Big px={34} ratio={1.3} className="text-on-control-muted mt-[6px]">
              {card.record}
            </Big>
          ) : null}
        </div>
      </div>
      {card.results.length > 0 ? (
        <div className="mt-auto flex flex-wrap gap-[18px]">
          {card.results.map((result, index) => (
            <ResultDot key={index} result={result} />
          ))}
        </div>
      ) : null}
    </>
  );
}

function TableBody({ card }: { card: TournamentTableCard }) {
  return (
    <>
      <Big px={96} ratio={1.05} tracking={-0.04} expanded className="mt-[12px]">
        {card.title}
      </Big>
      <div className="mt-[36px] flex flex-col gap-[16px]">
        {card.rows.map((row, index) => (
          <div key={index} className="flex items-center gap-[28px]">
            <Big px={40} className="w-[56px] shrink-0 text-center" expanded>
              {row.place}
            </Big>
            <InitialsSquare
              init={initials(row.markName)}
              size={60}
              radius={14}
              px={24}
              variant={index === 0 ? "solid" : "outline"}
            />
            <Big
              px={38}
              ratio={1.2}
              className={
                row.isViewer
                  ? "min-w-0 flex-1 truncate font-semibold"
                  : "min-w-0 flex-1 truncate"
              }
            >
              <span dir="auto">{row.team}</span>
            </Big>
            {row.points ? (
              <Big px={34} className="text-on-control-muted shrink-0">
                {row.points}
              </Big>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}

// The card renders on black in both modes, so it keeps the light palette.
export function TournamentShareCard({
  card,
}: {
  card: TournamentShareCardModel;
}) {
  return (
    <div
      className="light bg-ink text-paper flex flex-col"
      style={{
        width: TOURNAMENT_CARD_SIZE,
        height: TOURNAMENT_CARD_SIZE,
        padding: PAD,
      }}
    >
      <CardHead card={card} />
      {card.kind === "placing" ? (
        <PlacingBody card={card} />
      ) : (
        <TableBody card={card} />
      )}
    </div>
  );
}

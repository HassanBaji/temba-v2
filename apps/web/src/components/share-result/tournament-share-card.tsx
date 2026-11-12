"use client";

import { colors } from "@repo/design-tokens";
import { initials } from "@repo/domain/initials";
import type { ResultMarkVariant } from "@repo/domain/result-mark";
import type { TournamentShareCard as TournamentShareCardModel } from "@repo/domain/tournament-finished";

import { Big, InitialsSquare, Label, Wordmark } from "./story-parts";

export const TOURNAMENT_CARD_SIZE = 1080;

const PAD = 72;
const DOT = 92;

/** Solid for a win, an outline for a loss, half for a draw, faint when not played. */
function ResultDot({ result }: { result: ResultMarkVariant }) {
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
        r="46"
        fill={result === "won" ? colors.paper : "none"}
        stroke={edge}
        strokeWidth="6"
      />
      {result === "draw" ? (
        <path d="M50,4 A46,46 0 0,0 50,96 Z" fill={colors.paper} />
      ) : null}
    </svg>
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
    </div>
  );
}

"use client";

import { initials } from "@repo/domain/initials";
import { STORY_HEIGHT, STORY_WIDTH } from "@repo/domain/result-share-frame";

import {
  aloneShareLayout,
  type AloneShareFrame,
} from "./alone-teams-share-layout";
import { Big, InitialsSquare, Label, Wordmark } from "./story-parts";

export const ALONE_SQUARE_SIZE = 1080;

export type AloneShareCardModel = {
  eyebrow: string;
  name: string;
  meta: string;
  theTeams: string;
  teams: readonly {
    leftName: string;
    rightName: string;
    /** The pair's average, only with Show levels on. */
    average: string | null;
  }[];
  venue: string | null;
  day: string | null;
  time: string | null;
  /** The day and the time together, for the Square. */
  dayTime: string | null;
};

function TeamRow({
  number,
  team,
  stacked,
  rowHeight,
  namePx,
}: {
  number: string;
  team: AloneShareCardModel["teams"][number];
  stacked: boolean;
  rowHeight: number;
  namePx: number;
}) {
  const square = Math.round(namePx * 1.4);
  const name = (value: string) => (
    <div
      className="flex min-w-0 flex-1 items-center"
      style={{ gap: namePx / 2 }}
    >
      {stacked ? null : (
        <InitialsSquare
          init={initials(value)}
          size={square}
          radius={Math.round(square / 4)}
          px={Math.round(namePx * 0.5)}
          variant="outline"
        />
      )}
      <Big px={namePx} ratio={1.2} className="min-w-0 truncate font-semibold">
        <span dir="auto">{value}</span>
      </Big>
    </div>
  );
  return (
    <div
      className="border-dimrule flex items-center border-b-2"
      style={{ height: rowHeight, gap: namePx * 0.8 }}
    >
      <Label
        px={Math.round(namePx * 0.62)}
        className="text-on-control-muted shrink-0"
      >
        {number}
      </Label>
      {stacked ? (
        <div className="flex min-w-0 flex-1 flex-col">
          {name(team.leftName)}
          {name(team.rightName)}
        </div>
      ) : (
        <>
          {name(team.leftName)}
          {name(team.rightName)}
        </>
      )}
      {team.average ? (
        <Big
          px={Math.round(namePx * 0.85)}
          className="text-on-control-muted shrink-0"
        >
          {team.average}
        </Big>
      ) : null}
    </div>
  );
}

function TeamColumns({
  card,
  frame,
}: {
  card: AloneShareCardModel;
  frame: AloneShareFrame;
}) {
  const layout = aloneShareLayout(card.teams.length, frame);
  const perColumn = Math.ceil(card.teams.length / layout.columns);
  const columns = Array.from({ length: layout.columns }, (_, column) =>
    card.teams
      .map((team, index) => ({ team, index }))
      .slice(column * perColumn, (column + 1) * perColumn),
  );
  return (
    <div className="flex gap-[48px]">
      {columns.map((rows, column) => (
        <div key={column} className="min-w-0 flex-1">
          {rows.map(({ team, index }) => (
            <TeamRow
              key={index}
              number={String(index + 1).padStart(2, "0")}
              team={team}
              stacked={layout.stacked}
              rowHeight={layout.rowHeight}
              namePx={layout.namePx}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Head({ card, px }: { card: AloneShareCardModel; px: number }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <Wordmark mark={Math.round(px * 1.4)} px={px} />
      <Label
        px={Math.round(px * 0.6)}
        className="text-on-control-muted shrink-0 uppercase"
      >
        {card.eyebrow}
      </Label>
    </div>
  );
}

// Both images render on black in both modes, so they keep the light palette.
export function AloneTeamsStory({ card }: { card: AloneShareCardModel }) {
  return (
    <div
      className="light bg-ink text-paper flex flex-col"
      style={{ width: STORY_WIDTH, height: STORY_HEIGHT, padding: 96 }}
    >
      <Head card={card} px={40} />
      <Big
        px={150}
        ratio={0.98}
        tracking={-0.04}
        expanded
        className="mt-[80px]"
      >
        <span dir="auto">{card.name}</span>
      </Big>
      <Label px={26} className="text-on-control-muted mt-[40px] uppercase">
        {card.meta}
      </Label>
      <div className="bg-dimrule mt-[36px] h-[2px]" />
      <Label
        px={22}
        className="text-on-control-muted mb-[12px] mt-[36px] uppercase"
      >
        {card.theTeams}
      </Label>
      <TeamColumns card={card} frame="story" />
      <div className="mt-auto flex items-end justify-between gap-8">
        <Big px={36} ratio={1.2} className="min-w-0 font-semibold">
          <span dir="auto">{card.venue}</span>
        </Big>
        <div className="shrink-0 text-end">
          <Big px={36} ratio={1.2} className="font-semibold">
            {card.day}
          </Big>
          <Big px={26} ratio={1.3} className="text-on-control-muted">
            {card.time}
          </Big>
        </div>
      </div>
    </div>
  );
}

export function AloneTeamsSquare({ card }: { card: AloneShareCardModel }) {
  return (
    <div
      className="light bg-ink text-paper flex flex-col"
      style={{
        width: ALONE_SQUARE_SIZE,
        height: ALONE_SQUARE_SIZE,
        padding: 72,
      }}
    >
      <Head card={card} px={36} />
      <div className="mt-[48px] flex items-start justify-between gap-8">
        <Big px={92} ratio={1} tracking={-0.04} expanded className="min-w-0">
          <span dir="auto">{card.name}</span>
        </Big>
        <div className="shrink-0 text-end">
          <Big px={24} ratio={1.35} className="text-on-control-muted">
            {card.dayTime}
          </Big>
          <Big
            px={24}
            ratio={1.35}
            className="text-on-control-muted max-w-[320px]"
          >
            <span dir="auto">{card.venue}</span>
          </Big>
        </div>
      </div>
      <div className="bg-dimrule mt-[36px] h-[2px]" />
      <div className="mt-[12px]">
        <TeamColumns card={card} frame="square" />
      </div>
    </div>
  );
}

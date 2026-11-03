"use client";

import type { FootballBib } from "@repo/domain/football-lineup";
import type { PlayedColumn, PlayedRow } from "@repo/domain/played-game";

import { UserAvatar } from "~/components/common/user-avatar";
import { BibChip, bibStyle } from "~/components/games/football-bibs";
import { ResultMark } from "~/components/temba/result-mark";
import { cn } from "~/lib/utils";

type Fill = PlayedColumn["fill"] | FootballBib;

function rowLook(row: PlayedRow, fill: Fill) {
  if (row.isYou) {
    return {
      className: "bg-paper text-ink border-ink border-2",
      style: undefined,
    };
  }
  if (fill === "ink") {
    return { className: "bg-ink text-paper border-ink", style: undefined };
  }
  if (fill === "paper") {
    return { className: "bg-paper text-ink border-input", style: undefined };
  }
  return { className: "", style: bibStyle(fill) };
}

function PlayerRow({
  row,
  fill,
  onPress,
}: {
  row: PlayedRow;
  fill: Fill;
  onPress?: (row: PlayedRow) => void;
}) {
  const look = rowLook(row, fill);
  const label = [
    row.isYou ? `${row.fullName} (You)` : row.fullName,
    row.meta,
    `Level ${row.level}`,
    row.trailing,
  ]
    .filter(Boolean)
    .join(", ");
  const body = (
    <>
      <UserAvatar name={row.fullName} image={row.image} size="sm" />
      <span className="min-w-0 flex-1 leading-[1.15]">
        <span
          className={cn(
            "text-meta block truncate",
            row.isYou && "font-semibold",
          )}
        >
          {row.name}
        </span>
        {row.meta ? (
          <span className="block font-mono text-[10px] opacity-70">
            {row.meta}
          </span>
        ) : null}
      </span>
      <span className="flex flex-col items-end leading-[1.15]">
        <span className="font-expanded text-[14px]">{row.level}</span>
        {row.trailing ? (
          <span className="font-mono text-[10px] opacity-70">
            {row.trailing}
          </span>
        ) : null}
      </span>
    </>
  );
  const className = cn(
    "flex h-12 w-full min-w-0 items-center gap-2 rounded-[10px] border px-2 text-left",
    look.className,
  );
  return onPress ? (
    <button
      type="button"
      aria-label={label}
      onClick={() => onPress(row)}
      className={cn(
        className,
        "focus-visible:ring-ring/50 outline-none hover:opacity-85 focus-visible:ring-[3px]",
      )}
      style={look.style}
    >
      {body}
    </button>
  ) : (
    <div aria-label={label} className={className} style={look.style}>
      {body}
    </div>
  );
}

function Swatch({ fill }: { fill: Fill }) {
  if (fill !== "ink" && fill !== "paper") {
    return <BibChip bib={fill} className="size-3.5" />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-3.5 shrink-0 rounded-[4px] border",
        fill === "ink" ? "bg-ink border-ink" : "bg-paper border-input",
      )}
    />
  );
}

function Column({
  column,
  onPressPlayer,
}: {
  column: PlayedColumn;
  onPressPlayer?: (row: PlayedRow) => void;
}) {
  const fill: Fill = column.bib ?? column.fill;
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="flex items-center justify-between gap-2 px-0.5 pb-1.5">
        <h3 className="text-meta flex min-w-0 items-center gap-2 font-semibold">
          <Swatch fill={fill} />
          <span className="truncate">{column.title}</span>
        </h3>
        <span className="text-muted-foreground text-eyebrow flex items-center gap-1.5 whitespace-nowrap">
          {column.won ? (
            <ResultMark variant="won" decorative className="size-3.5" />
          ) : null}
          {column.word}
        </span>
      </div>
      {column.players.map((row) => (
        <PlayerRow
          key={row.userId}
          row={row}
          fill={fill}
          onPress={onPressPlayer}
        />
      ))}
    </div>
  );
}

/** The two rosters side by side, then anyone on neither. */
export function PlayedColumns({
  columns,
  unplaced = [],
  onPressPlayer,
}: {
  columns: [PlayedColumn, PlayedColumn];
  unplaced?: PlayedRow[];
  onPressPlayer?: (row: PlayedRow) => void;
}) {
  return (
    <section aria-label="Line-up" className="space-y-4">
      <div className="flex items-start gap-2.5">
        <Column column={columns[0]} onPressPlayer={onPressPlayer} />
        <Column column={columns[1]} onPressPlayer={onPressPlayer} />
      </div>
      {unplaced.length > 0 ? (
        <div className="space-y-1.5">
          <h3 className="text-muted-foreground text-eyebrow">Not on a team</h3>
          {unplaced.map((row) => (
            <PlayerRow
              key={row.userId}
              row={row}
              fill="paper"
              onPress={onPressPlayer}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

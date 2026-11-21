"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";

import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";

import { useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

import { SeriesBadge } from "./series-badge";

export type SeriesAttachOption = {
  id: string;
  name: string;
  emblem: SeriesEmblem;
  colour: SeriesColour;
  edition: number;
};

/** The picked Series while it is still offered; otherwise none. */
export function seriesAttachPick<T extends { id: string }>(
  options: readonly T[],
  seriesId: string | null,
): T | null {
  return seriesId
    ? (options.find((option) => option.id === seriesId) ?? null)
    : null;
}

function SeriesOptionRow({
  selected,
  onSelect,
  leading,
  title,
  hint,
}: {
  selected: boolean;
  onSelect: () => void;
  leading: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-lg border px-3.5 py-3 text-start outline-none transition-colors focus-visible:ring-[3px]",
        selected
          ? "border-ink bg-control text-on-control"
          : "border-rule bg-paper text-ink hover:bg-wash",
      )}
    >
      {leading}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn("text-body break-words", selected && "font-semibold")}
        >
          {title}
        </span>
        <span
          className={cn(
            "text-eyebrow",
            selected ? "text-on-control-muted" : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      </span>
      {selected ? (
        <Check aria-hidden="true" className="size-[18px] shrink-0" />
      ) : null}
    </button>
  );
}

/**
 * One choice of Series for a Game, used by Create and by Edit game (design
 * 2a): "Not part of a series" first, then each running Series with the
 * Edition the Game would be.
 */
export function SeriesField({
  id,
  labelledBy,
  label,
  options,
  value,
  onChange,
  groupName,
  showNote = true,
}: {
  id: string;
  /** The visible heading that names the group, or else `label`. */
  labelledBy?: string;
  label?: string;
  options: readonly SeriesAttachOption[];
  value: string | null;
  onChange: (seriesId: string | null) => void;
  groupName: string;
  /** Off where the surrounding sheet already says whose series these are. */
  showNote?: boolean;
}) {
  const copy = useMessages().series.attach;
  const noteId = `${id}-note`;
  return (
    <div className="flex flex-col gap-2.5">
      <RovingRadioGroup
        id={id}
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        aria-describedby={showNote ? noteId : undefined}
        className="flex flex-col gap-1.5 outline-none"
      >
        <SeriesOptionRow
          selected={value === null}
          onSelect={() => onChange(null)}
          leading={
            <Hatch
              radius="md"
              className={cn(
                "block size-11 shrink-0",
                value === null && "hatch-on-control",
              )}
            />
          }
          title={copy.none}
          hint={copy.noneHint}
        />
        {options.map((option) => {
          const selected = option.id === value;
          return (
            <SeriesOptionRow
              key={option.id}
              selected={selected}
              onSelect={() => onChange(option.id)}
              leading={
                <SeriesBadge
                  emblem={option.emblem}
                  colour={option.colour}
                  size="list"
                />
              }
              title={option.name}
              hint={
                selected
                  ? copy.willBe(option.edition)
                  : copy.wouldBe(option.edition)
              }
            />
          );
        })}
      </RovingRadioGroup>
      {showNote ? (
        <p id={noteId} className="text-muted-foreground text-eyebrow">
          {copy.note(groupName)}
        </p>
      ) : null}
    </div>
  );
}

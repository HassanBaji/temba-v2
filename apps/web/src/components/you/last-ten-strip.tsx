"use client";

import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import type { FormSlotView } from "./you-form-model";
import { YouSection } from "./you-section";

function Mark({ slot }: { slot: FormSlotView }) {
  if (slot.kind === "empty") {
    return (
      <span className="border-rule relative block h-7 overflow-hidden rounded-[6px] border">
        <span aria-hidden="true" className="hatch absolute inset-0" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-eyebrow relative flex h-7 items-center justify-center overflow-hidden rounded-[6px] border font-semibold",
        slot.outcome === "won"
          ? "border-ink bg-ink text-paper"
          : "border-ink bg-paper text-ink",
      )}
    >
      {slot.outcome === "draw" ? (
        <span className="hatch absolute inset-0" />
      ) : null}
      <span className="relative">{slot.mark}</span>
    </span>
  );
}

/**
 * Ten marks, oldest first: solid for a win, outline for a loss, hatched for
 * not played. The row follows the reading direction, so in Arabic the latest
 * is on the left.
 */
export function LastTenStrip({
  title,
  record,
  slots,
}: {
  title: string;
  record: string;
  slots: readonly FormSlotView[];
}) {
  const m = useMessages();
  const withDeltas = slots.some(
    (slot) => slot.kind === "played" && slot.delta !== null,
  );

  return (
    <YouSection title={title} meta={record}>
      <ol className="grid grid-cols-10 gap-1.5">
        {slots.map((slot) => (
          <li key={slot.key} className="flex min-w-0 flex-col gap-1">
            <span className="sr-only">{slot.spoken}</span>
            <Mark slot={slot} />
            {withDeltas ? (
              <span
                aria-hidden="true"
                dir="ltr"
                className="text-muted-foreground block h-3 text-center font-mono text-[9px] tabular-nums leading-3"
              >
                {slot.kind === "played" ? slot.delta : null}
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="text-eyebrow text-muted-foreground flex justify-between"
      >
        <span>{m.you.form.older}</span>
        <span>{m.you.form.latest}</span>
      </div>
    </YouSection>
  );
}

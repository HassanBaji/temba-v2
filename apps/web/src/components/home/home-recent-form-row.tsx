"use client";

import type { Messages } from "@repo/i18n/messages";
import { type RecentFormBar } from "@repo/domain/home-recent-form";
import { useMessages } from "~/components/locale-provider";

function slotLabel(bar: RecentFormBar, m: Messages): string {
  const labels = m.webAuth.home.recentForm.slot;
  if (bar.kind === "empty") {
    return labels.notPlayed;
  }
  if (bar.outcome === "won") {
    return labels.won;
  }
  if (bar.outcome === "lost") {
    return labels.lost;
  }
  return labels.drawn;
}

export function FormSlot({
  bar,
  size = "default",
}: {
  bar: RecentFormBar;
  size?: "default" | "compact";
}) {
  const m = useMessages();
  const compact = size === "compact";

  if (bar.kind === "empty") {
    return (
      <div
        className={
          compact
            ? "relative h-[26px] min-w-0 flex-1"
            : "relative h-[38px] min-w-0 flex-1"
        }
      >
        <div
          aria-hidden="true"
          className={
            compact
              ? "hatch absolute inset-0 rounded-[4px]"
              : "hatch rounded-xs absolute inset-0"
          }
        />
        <span className="sr-only">{slotLabel(bar, m)}</span>
      </div>
    );
  }

  if (bar.outcome === "won") {
    return (
      <div
        className={
          compact
            ? "bg-ink text-paper text-eyebrow flex h-[26px] min-w-0 flex-1 items-center justify-center rounded-[4px] font-semibold"
            : "bg-ink text-paper rounded-xs text-meta flex h-[38px] min-w-0 flex-1 items-center justify-center font-semibold"
        }
      >
        <span className="sr-only">{slotLabel(bar, m)}</span>
        <span aria-hidden="true">{bar.label}</span>
      </div>
    );
  }

  return (
    <div
      className={
        compact
          ? "border-ink bg-paper text-ink text-eyebrow relative flex h-[26px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-[4px] border font-semibold"
          : "border-ink bg-paper text-ink rounded-xs text-meta relative flex h-[38px] min-w-0 flex-1 items-center justify-center overflow-hidden border-[1.5px] font-semibold"
      }
    >
      {bar.outcome === "draw" ? (
        <span
          aria-hidden="true"
          className="bg-ink absolute inset-0 origin-center opacity-80"
          style={{
            clipPath: "polygon(100% 0, 100% 1.5px, 1.5px 100%, 0 100%)",
          }}
        />
      ) : null}
      <span className="sr-only">{slotLabel(bar, m)}</span>
      <span aria-hidden="true" className="relative">
        {bar.label}
      </span>
    </div>
  );
}

/**
 * Standalone 46px W/L mark for the Final Game-details hero (game-details
 * redesign, TEM-179): the exact solid-ink-fill (win) / ink-outline (loss)
 * rule as `FormSlot` above, at a size no existing component renders (form
 * slots are 38px and always inline in a row, never standalone).
 */
export function WinLossMark({ outcome }: { outcome: "won" | "lost" | "draw" }) {
  const m = useMessages();
  const label =
    outcome === "won"
      ? m.common.win
      : outcome === "lost"
        ? m.common.loss
        : m.common.draw;
  const glyph = outcome === "won" ? "W" : outcome === "lost" ? "L" : "D";

  if (outcome === "won") {
    return (
      <div className="bg-ink text-paper flex size-[46px] shrink-0 items-center justify-center rounded-sm text-xl font-semibold">
        <span className="sr-only">{label}</span>
        <span aria-hidden="true">{glyph}</span>
      </div>
    );
  }

  return (
    <div className="border-ink bg-paper text-ink relative flex size-[46px] shrink-0 items-center justify-center overflow-hidden rounded-sm border-[1.5px] text-xl font-semibold">
      {outcome === "draw" ? (
        <span
          aria-hidden="true"
          className="bg-ink absolute inset-0 origin-center opacity-80"
          style={{
            clipPath: "polygon(100% 0, 100% 1.5px, 1.5px 100%, 0 100%)",
          }}
        />
      ) : null}
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="relative">
        {glyph}
      </span>
    </div>
  );
}

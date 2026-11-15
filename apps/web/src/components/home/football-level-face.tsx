"use client";

import { ChevronRight } from "lucide-react";

import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";
import type { RatingsLevelFooter } from "@repo/domain/ratings-screen";

import { Sparkline } from "./sparkline";

type Tone = "paper" | "focus";

const TONE = {
  paper: {
    muted: "text-muted-foreground",
    rule: "border-rule",
    fill: "bg-ink",
    line: "text-ink",
    hatch: "paper",
  },
  focus: {
    muted: "text-dim",
    rule: "border-dimrule",
    fill: "bg-on-focus",
    line: "text-on-focus",
    hatch: "ink",
  },
} as const;

export type FootballLevelFaceProps = {
  numberLabel: string;
  number: string;
  scale: { percent: number; ticks: readonly string[] };
  change: {
    amount: string;
    caption: string;
    points: readonly number[];
  } | null;
  start: string | null;
  footer: RatingsLevelFooter;
  tone: Tone;
  /** The card opens somewhere, so the footer ends in a chevron. */
  opens?: boolean;
};

/**
 * The football Level card body: no band, only the OVR, the 40 to 99 scale
 * under it, the recent change top right, and the way to confirming or the
 * last Match in the footer.
 */
export function FootballLevelFace({
  numberLabel,
  number,
  scale,
  change,
  start,
  footer,
  tone,
  opens = false,
}: FootballLevelFaceProps) {
  const t = TONE[tone];
  return (
    <>
      <span className="block px-5 pb-4 pt-[18px]">
        <span className="flex items-end justify-between gap-3">
          <span className="flex min-w-0 flex-col">
            <span className={cn("text-meta", t.muted)}>{numberLabel}</span>
            <span className="font-expanded mt-1.5 text-[92px] tabular-nums leading-[0.86]">
              {number}
            </span>
          </span>
          {change ? (
            <span className="flex shrink-0 flex-col items-end gap-1 pb-0.5">
              <Sparkline
                values={change.points}
                width={70}
                height={24}
                className={t.line}
              />
              <span className="flex items-baseline gap-1.5">
                <bdi
                  dir="ltr"
                  className="font-expanded text-lead tabular-nums leading-none"
                >
                  {change.amount}
                </bdi>
                <span className={cn("text-eyebrow", t.muted)}>
                  {change.caption}
                </span>
              </span>
            </span>
          ) : start ? (
            <span
              className={cn(
                "text-eyebrow max-w-[6.5rem] shrink-0 pb-0.5 text-end",
                t.muted,
              )}
            >
              {start}
            </span>
          ) : null}
        </span>
        <span className="mt-[18px] block">
          <span className="relative block h-2.5 overflow-hidden rounded-[5px]">
            <Hatch tone={t.hatch} className="absolute inset-0 rounded-[5px]" />
            <span
              className={cn("absolute inset-y-0 start-0 rounded-[5px]", t.fill)}
              style={{ width: `${scale.percent}%` }}
            />
          </span>
          <span
            className={cn(
              "mt-1.5 flex justify-between text-[11px] tabular-nums",
              t.muted,
            )}
          >
            {scale.ticks.map((tick) => (
              <span key={tick}>{tick}</span>
            ))}
          </span>
        </span>
      </span>
      <span
        className={cn(
          "text-meta flex items-center justify-between gap-3 border-t px-5 py-[13px]",
          t.rule,
        )}
      >
        <span className={cn("shrink-0", t.muted)}>{footer.label}</span>
        <span className="flex min-w-0 items-center gap-2.5">
          {footer.pips ? <Pips {...footer.pips} tone={tone} /> : null}
          {footer.result ? (
            <span className={cn("truncate", t.muted)}>{footer.result}</span>
          ) : null}
          {footer.value ? (
            footer.pips ? (
              <span className="shrink-0 font-semibold">{footer.value}</span>
            ) : (
              <bdi
                dir="ltr"
                className="font-expanded text-body shrink-0 tabular-nums"
              >
                {footer.value}
              </bdi>
            )
          ) : null}
          {opens ? (
            <ChevronRight
              aria-hidden="true"
              className={cn("size-4 shrink-0 rtl:-scale-x-100", t.muted)}
            />
          ) : null}
        </span>
      </span>
    </>
  );
}

function Pips({
  done,
  total,
  tone,
}: {
  done: number;
  total: number;
  tone: Tone;
}) {
  const t = TONE[tone];
  return (
    <span aria-hidden="true" className="flex shrink-0 gap-[3px]">
      {Array.from({ length: total }, (_, index) =>
        index < done ? (
          <span key={index} className={cn("h-2 w-3.5 rounded-[2px]", t.fill)} />
        ) : (
          <Hatch
            key={index}
            tone={t.hatch}
            className="h-2 w-3.5 rounded-[2px]"
          />
        ),
      )}
    </span>
  );
}

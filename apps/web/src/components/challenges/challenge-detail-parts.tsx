"use client";

import type { ChallengeTeamFaceView } from "@repo/domain/challenge-detail";
import type { SurfaceTone } from "@repo/domain/surface-tone";

import { useMessages } from "~/components/locale-provider";
import { Hatch } from "~/components/ui/hatch";
import { cn } from "~/lib/utils";

/** The outlined mono "CHALLENGE" tag in the detail's header row. */
export function ChallengeTag({ tone = "paper" }: { tone?: SurfaceTone }) {
  const m = useMessages();
  return (
    <span
      className={cn(
        "rounded-[6px] border px-[7px] py-1 font-mono text-[10px] uppercase leading-none tracking-[0.08em]",
        tone === "ink"
          ? "border-dimrule text-dim"
          : "border-rule text-muted-foreground",
      )}
    >
      {m.challenge.marker}
    </span>
  );
}

/** A Team's crest: its initials on a solid square. */
export function CrestTile({
  initials,
  tone = "paper",
  size = "lg",
  className,
}: {
  initials: string;
  tone?: SurfaceTone;
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center tracking-[-0.02em] [font-variation-settings:'wdth'_112,'wght'_700]",
        size === "lg"
          ? "size-14 rounded-[15px] text-[18px]"
          : "text-eyebrow size-[34px] rounded-[9px]",
        tone === "ink"
          ? "bg-focus-control text-on-focus-control"
          : "bg-control text-on-control",
        className,
      )}
    >
      {initials}
    </span>
  );
}

function TeamColumn({
  face,
  tone,
}: {
  face: ChallengeTeamFaceView;
  tone: SurfaceTone;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <CrestTile initials={face.initials} tone={tone} />
      <div className="space-y-0.5">
        <p className="text-body font-semibold">{face.name}</p>
        {face.line ? (
          <p
            className={cn(
              "text-eyebrow",
              tone === "ink" ? "text-dim" : "text-muted-foreground",
            )}
          >
            {face.line}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function MissingOpponent({ name, line }: { name: string; line: string }) {
  return (
    <div className="text-muted-foreground flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <Hatch className="size-14 shrink-0 rounded-[15px]" />
      <div className="space-y-0.5">
        <p className="text-body font-semibold">{name}</p>
        <p className="text-eyebrow">{line}</p>
      </div>
    </div>
  );
}

/**
 * Both Teams of a Challenge. Until a Proposal lands the second Team is a
 * hatched tile: the opponent is not there yet.
 */
export function ChallengeTeamVsTeam({
  left,
  right,
  missing,
  tone = "paper",
  className,
}: {
  left: ChallengeTeamFaceView;
  right: ChallengeTeamFaceView | null;
  missing?: { name: string; line: string };
  tone?: SurfaceTone;
  className?: string;
}) {
  const m = useMessages();
  const copy = m.challenge.detailScreen;
  const label = [
    left.accessibilityLabel,
    right?.accessibilityLabel ??
      (missing ? `${missing.name} ${missing.line}` : null),
  ]
    .filter((part): part is string => part != null)
    .join(` ${copy.versus} `);
  return (
    <section
      aria-label={label}
      className={cn(
        "flex items-center gap-3",
        tone === "paper" && "border-rule rounded-xl border p-[18px]",
        className,
      )}
    >
      <TeamColumn face={left} tone={tone} />
      <span
        aria-hidden="true"
        className={cn(
          "text-eyebrow w-[34px] shrink-0 text-center",
          tone === "ink" ? "text-dim" : "text-muted-foreground",
        )}
      >
        {copy.versus}
      </span>
      {right ? (
        <TeamColumn face={right} tone={tone} />
      ) : missing ? (
        <MissingOpponent name={missing.name} line={missing.line} />
      ) : null}
    </section>
  );
}

/** Label and value rows on one card, split by hairlines. */
export function ChallengeInfoRows({
  rows,
  className,
}: {
  rows: readonly { key: string; label: string; value: string }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "border-rule divide-rule rounded-card bg-paper divide-y overflow-hidden border",
        className,
      )}
    >
      {rows.map((row) => (
        <div
          key={row.key}
          className="text-body flex justify-between gap-4 px-[18px] py-3.5"
        >
          <dt className="text-muted-foreground shrink-0">{row.label}</dt>
          <dd className="min-w-0 text-end">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "From the team" and the poster's note. */
export function ChallengeNote({ note }: { note: string }) {
  const m = useMessages();
  return (
    <section className="border-rule rounded-card bg-paper border px-[18px] py-4">
      <h2 className="text-eyebrow text-muted-foreground">
        {m.challenge.detailScreen.note}
      </h2>
      <p className="text-body mt-1 whitespace-pre-line leading-normal">
        {note}
      </p>
    </section>
  );
}

/** A small grey line under a card. */
export function ChallengeFootnote({ children }: { children: string }) {
  return (
    <p className="text-eyebrow text-muted-foreground mt-2 leading-normal">
      {children}
    </p>
  );
}

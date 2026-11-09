import { cn } from "~/lib/utils";

const SIZE_CLASS = {
  crest: "size-16 rounded-[17px] text-[21px] font-bold tracking-[-0.02em]",
  seat: "size-10 rounded-[11px] text-[14px] font-semibold",
  rival: "size-10 rounded-[11px] text-meta font-bold tracking-[-0.02em]",
  member: "size-[34px] rounded-[9px] text-eyebrow font-semibold",
  mini: "size-8 rounded-[9px] text-[11px] font-bold tracking-[-0.02em]",
} as const;

const TONE_CLASS = {
  ink: "bg-control text-on-control",
  paper: "border-rule bg-paper text-ink border",
  inverse: "bg-focus-control text-on-focus-control",
  hatched: "hatch",
  "hatched-on-ink": "hatch hatch-on-ink",
  empty: "border-rule border border-dashed",
} as const;

export type TeamTileTone = keyof typeof TONE_CLASS;

/**
 * A square initials tile: the Team crest, a member's seat or a Rival. Ink for
 * the viewer and other Teams, paper for teammates, inverse on the ink hero,
 * hatched for a seat that is not filled yet.
 */
export function TeamTile({
  text,
  tone,
  size,
  className,
  children,
}: {
  text?: string;
  tone: TeamTileTone;
  size: keyof typeof SIZE_CLASS;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center",
        SIZE_CLASS[size],
        TONE_CLASS[tone],
        className,
      )}
    >
      {children ?? text}
    </span>
  );
}

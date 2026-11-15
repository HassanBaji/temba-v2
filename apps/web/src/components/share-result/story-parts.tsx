import { bibColors, colors } from "@repo/design-tokens";
import type { FootballBib } from "@repo/domain/football-lineup";

import { cn } from "~/lib/utils";

/** The won mark reversed for ink: a paper disc with the arc cut in ink. */
export function StoryMark({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      width={size}
      height={size}
      className="block shrink-0"
    >
      <circle cx="50" cy="50" r="44" fill={colors.paper} />
      <path
        d="M6,50 C18,16 82,16 94,50"
        fill="none"
        stroke={colors.ink}
        strokeWidth="6"
      />
    </svg>
  );
}

export function Wordmark({ mark, px }: { mark: number; px: number }) {
  return (
    <div className="flex items-center" style={{ gap: mark / 3 }}>
      <StoryMark size={mark} />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 300,
          fontSize: px,
          lineHeight: 1.2,
          letterSpacing: "0.18em",
        }}
      >
        TEMBA
      </span>
    </div>
  );
}

/** A mono label like "WON" or "FRIENDLY · PADEL". */
export function Label({
  px,
  tracking = 0.12,
  className,
  children,
}: {
  px: number;
  tracking?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn("block font-mono", className)}
      style={{ fontSize: px, lineHeight: 1.2, letterSpacing: `${tracking}em` }}
    >
      {children}
    </span>
  );
}

/** Big type at the card's own scale. */
export function Big({
  px,
  ratio = 1.1,
  tracking,
  expanded = false,
  className,
  children,
}: {
  px: number;
  ratio?: number;
  tracking?: number;
  expanded?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "block tabular-nums",
        expanded && "font-expanded",
        className,
      )}
      style={{
        fontSize: px,
        lineHeight: ratio,
        letterSpacing: tracking != null ? `${tracking}em` : undefined,
      }}
    >
      {children}
    </span>
  );
}

/** A bib colour square; a black bib gets a grey edge so it shows on ink. */
export function BibSquare({
  bib,
  size,
  radius,
}: {
  bib: FootballBib;
  size: number;
  radius: number;
}) {
  const { fill } = bibColors[bib];
  const edge =
    bib === "black" ? colors.muted : bib === "white" ? colors.rule : fill;
  return (
    <span
      aria-hidden="true"
      className="block shrink-0"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: fill,
        border: `2px solid ${edge}`,
      }}
    />
  );
}

/** A square initials tile: solid paper, or an outline in a given ink. */
export function InitialsSquare({
  init,
  size,
  radius,
  px,
  variant,
}: {
  init: string;
  size: number;
  radius: number;
  px: number;
  variant: "solid" | "outline" | "outline-muted";
}) {
  const solid = variant === "solid";
  const edge = variant === "outline-muted" ? colors.muted : colors.paper;
  const ink =
    variant === "solid"
      ? colors.ink
      : variant === "outline-muted"
        ? colors.onControlMuted
        : colors.paper;
  return (
    <span
      className="flex shrink-0 items-center justify-center font-semibold"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: solid ? colors.paper : "transparent",
        border: solid ? undefined : `2px solid ${edge}`,
        color: ink,
        fontSize: px,
      }}
    >
      {init}
    </span>
  );
}

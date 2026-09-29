import { RESULT_MARK_LABEL, type ResultMarkVariant } from "~/lib/result-mark";
import { cn } from "~/lib/utils";

export type { ResultMarkVariant } from "~/lib/result-mark";

/**
 * The Temba result mark, drawn as `#tembaWon` / `#tembaLost` /
 * `#tembaNotPlayed` on the design canvas: a disc with a cut-out arc — filled
 * for a win, outlined for a loss, and hatched behind a rule-weight outline
 * when there is no result to read (no seat, or a Match with no score).
 *
 * The canvas has no draw symbol; a draw is the loss outline struck through
 * top-right to bottom-left, the same diagonal Home's recent-form draw slot uses.
 */

/** The cut-out arc, identical across every variant. */
const ARC = "M6,50 C18,16 82,16 94,50";

export function ResultMark({
  variant,
  decorative = false,
  className,
  style,
}: {
  variant: ResultMarkVariant;
  /** Drop the `sr-only` label when adjacent visible text already says it. */
  decorative?: boolean;
  /** Size and spacing belong to the caller — `size-6`, `size-[18px]`, … */
  className?: string;
  style?: React.CSSProperties;
}) {
  const notPlayed = variant === "not-played";

  return (
    <span
      data-slot="result-mark"
      data-variant={variant}
      aria-hidden={decorative ? true : undefined}
      style={style}
      className={cn(
        "relative block shrink-0",
        notPlayed ? "text-rule" : "text-ink",
        className,
      )}
    >
      {decorative ? null : (
        <span className="sr-only">{RESULT_MARK_LABEL[variant]}</span>
      )}

      {notPlayed ? (
        <span
          aria-hidden="true"
          className="hatch absolute inset-0 rounded-full"
        />
      ) : null}

      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="relative block size-full"
      >
        {variant === "won" ? (
          <>
            <circle cx="50" cy="50" r="44" fill="currentColor" />
            <path
              d={ARC}
              fill="none"
              stroke="var(--color-paper)"
              strokeWidth="5"
            />
          </>
        ) : notPlayed ? (
          <path d={ARC} fill="none" stroke="currentColor" strokeWidth="2" />
        ) : (
          <>
            <circle
              cx="50"
              cy="50"
              r="43"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path d={ARC} fill="none" stroke="currentColor" strokeWidth="3" />
            {variant === "draw" ? (
              <path
                d="M81,19 L19,81"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
            ) : null}
          </>
        )}
      </svg>
    </span>
  );
}

/** A result mark beside the word that names it — "Won", "Pool winner", … */
export function ResultTag({
  variant,
  children,
  className,
}: {
  variant: ResultMarkVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="result-tag"
      className={cn(
        "text-ink text-meta inline-flex shrink-0 items-center gap-1 font-semibold",
        className,
      )}
    >
      <ResultMark variant={variant} decorative className="size-3.5" />
      {children}
    </span>
  );
}

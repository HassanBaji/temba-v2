import { cn } from "~/lib/utils";

/**
 * The Temba result mark, drawn as `#tembaWon` / `#tembaLost` /
 * `#tembaNotPlayed` on the design canvas: a disc with a cut-out arc — filled
 * for a win, outlined for a loss, and hatched behind a rule-weight outline
 * when there is no result to read (no seat, or a Match with no score).
 */
export type ResultMarkVariant = "won" | "lost" | "not-played";

const RESULT_MARK_LABEL: Record<ResultMarkVariant, string> = {
  won: "Won",
  lost: "Lost",
  "not-played": "Not played",
};

/** The cut-out arc, identical across the three variants. */
const ARC = "M6,50 C18,16 82,16 94,50";

export function ResultMark({
  variant,
  className,
  style,
}: {
  variant: ResultMarkVariant;
  /** Size and spacing belong to the caller — `size-6`, `size-[18px]`, … */
  className?: string;
  style?: React.CSSProperties;
}) {
  const notPlayed = variant === "not-played";

  return (
    <span
      data-slot="result-mark"
      data-variant={variant}
      style={style}
      className={cn(
        "relative block shrink-0",
        notPlayed ? "text-rule" : "text-ink",
        className,
      )}
    >
      <span className="sr-only">{RESULT_MARK_LABEL[variant]}</span>

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
          </>
        )}
      </svg>
    </span>
  );
}

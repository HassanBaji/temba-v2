import {
  ResultMark,
  type ResultMarkVariant,
} from "~/components/temba/result-mark";
import { cn } from "~/lib/utils";

/**
 * A run of result marks, oldest first, so the strip reads left-to-right
 * toward now — the same direction `home-recent-form` reads.
 *
 * Missing results are not padded: a player with two results gets two marks.
 */
export function FormStrip({
  marks,
  size,
  gap = 4,
  className,
}: {
  /** Oldest first. Rendered one mark per entry, with no padding. */
  marks: readonly ResultMarkVariant[];
  /** Mark edge length in px — 18 on the Groups list, 14 on the Members tab. */
  size: number;
  /** Space between marks in px. */
  gap?: number;
  className?: string;
}) {
  if (marks.length === 0) {
    return null;
  }

  return (
    <span
      data-slot="form-strip"
      style={{ gap: `${gap}px` }}
      className={cn("flex items-center", className)}
    >
      {marks.map((variant, index) => (
        <ResultMark
          key={index}
          variant={variant}
          style={{ width: `${size}px`, height: `${size}px` }}
        />
      ))}
    </span>
  );
}

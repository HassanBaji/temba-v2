import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

export type TeamCreateTileTone = "in" | "plain" | "invited" | "added";

const SIZE = {
  sm: "size-[34px] rounded-[9px]",
  md: "size-10 rounded-[11px]",
} as const;

/**
 * A player's initials tile on New team: solid when in, outlined when only
 * listed, hatched while an invite waits, hatched and dashed for a number
 * added without Temba.
 */
export function TeamCreateTile({
  tone,
  size = "sm",
  children,
}: {
  tone: TeamCreateTileTone;
  size?: keyof typeof SIZE;
  children: ReactNode;
}) {
  const hatched = tone === "invited" || tone === "added";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "text-eyebrow flex shrink-0 items-center justify-center font-semibold",
        SIZE[size],
        tone === "in" &&
          "border-control-edge bg-control text-on-control border",
        tone === "plain" && "border-rule bg-paper text-ink border",
        hatched && "hatch text-ink",
        tone === "added" &&
          "border-input border border-dashed [box-shadow:none]",
      )}
    >
      {hatched && typeof children === "string" ? (
        <span className="bg-paper rounded-[3px] px-[3px]">{children}</span>
      ) : (
        children
      )}
    </span>
  );
}

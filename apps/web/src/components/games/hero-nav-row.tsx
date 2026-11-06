import type { SurfaceTone } from "@repo/domain/surface-tone";

import { BackButton } from "~/components/ui/nav-icon-button";
import { cn } from "~/lib/utils";

const GAMES_FALLBACK = "/dashboard/games";

/** The top row of a Game hero: back on the left, the actions on the right. */
export function HeroNavRow({
  tone,
  actions,
}: {
  tone: SurfaceTone;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <BackButton variant="boxed" surface={tone} href={GAMES_FALLBACK} />
      {actions ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2",
            tone === "ink" ? "text-on-focus" : "text-ink",
          )}
        >
          {actions}
        </div>
      ) : null}
    </div>
  );
}

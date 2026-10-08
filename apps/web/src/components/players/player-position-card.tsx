import { SurfaceLabel } from "~/components/common/surface-label";
import { Hatch } from "~/components/ui/hatch";
import type {
  CourtSideFill,
  PlayedSideView,
} from "@repo/domain/player-profile";
import { cn } from "~/lib/utils";

function NearSide({ fill }: { fill: CourtSideFill }) {
  return (
    <span className={cn("relative flex-1", fill === "ink" && "bg-ink")}>
      {fill === "hatch" ? <Hatch className="absolute inset-0" /> : null}
    </span>
  );
}

function Court({ court }: { court: PlayedSideView["court"] }) {
  return (
    <span
      aria-hidden="true"
      className="border-rule rounded-xs flex w-14 shrink-0 flex-col overflow-hidden border"
    >
      <span className="border-ink h-10 border-b" />
      <span className="divide-rule flex h-10 divide-x">
        <NearSide fill={court.left} />
        <NearSide fill={court.right} />
      </span>
    </span>
  );
}

export function PlayerPositionCard({ view }: { view: PlayedSideView }) {
  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile">Preferred position</SurfaceLabel>
      <div className="flex items-center gap-[18px] px-5 pb-5">
        <Court court={view.court} />
        <div>
          <p className="text-lead font-semibold">{view.label}</p>
          {view.subtitle ? (
            <p className="text-meta text-muted-foreground mt-1 tabular-nums">
              {view.subtitle}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

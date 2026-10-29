import { SurfaceLabel } from "~/components/common/surface-label";
import { Hatch } from "~/components/ui/hatch";
import type { FootballRoleView } from "@repo/domain/player-profile-football";

export function PlayerFootballRoleCard({ view }: { view: FootballRoleView }) {
  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile">Preferred position</SurfaceLabel>
      <div className="flex items-center gap-[18px] px-5 pb-5">
        <span
          aria-hidden="true"
          className="border-rule rounded-xs relative flex size-14 shrink-0 items-center justify-center overflow-hidden border font-semibold tabular-nums"
        >
          {view.code ?? <Hatch className="absolute inset-0" />}
        </span>
        <p className="text-lead font-semibold">{view.label}</p>
      </div>
    </section>
  );
}

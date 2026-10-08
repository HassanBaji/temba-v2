import { SurfaceLabel } from "~/components/common/surface-label";
import type { PlayerOverallView } from "@repo/domain/player-profile";

export function PlayerOverallCard({ view }: { view: PlayerOverallView }) {
  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile" meta={view.scope}>
        {view.title}
      </SurfaceLabel>
      <dl className="border-rule divide-rule grid grid-cols-2 divide-x border-t [&>div:nth-child(n+3)]:border-t">
        {view.tiles.map((tile) => (
          <div key={tile.label} className="border-rule px-5 py-4">
            <dt className="text-meta text-muted-foreground">{tile.label}</dt>
            <dd className="font-expanded mt-1 text-[22px] tabular-nums">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

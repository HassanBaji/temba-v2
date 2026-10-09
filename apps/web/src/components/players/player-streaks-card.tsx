import { SurfaceLabel } from "~/components/common/surface-label";
import { ResultMark } from "~/components/temba/result-mark";
import type { PlayerStreaksView } from "@repo/domain/player-profile";

export function PlayerStreaksCard({ view }: { view: PlayerStreaksView }) {
  return (
    <section className="border-rule bg-paper rounded-card overflow-hidden border">
      <SurfaceLabel inset="profile">Streaks</SurfaceLabel>
      <dl className="border-rule divide-rule grid grid-cols-2 divide-x border-t">
        <div className="px-5 py-4">
          <dt className="text-meta text-muted-foreground">Current streak</dt>
          <dd className="mt-1">
            <p className="text-lead font-semibold tabular-nums">
              {view.current.headline}
            </p>
            {view.current.wonMarks > 0 ? (
              <span aria-hidden="true" className="mt-2 flex flex-wrap gap-1">
                {Array.from({ length: view.current.wonMarks }, (_, index) => (
                  <ResultMark
                    key={index}
                    variant="won"
                    decorative
                    className="size-4"
                  />
                ))}
              </span>
            ) : null}
          </dd>
        </div>
        <div className="px-5 py-4">
          <dt className="text-meta text-muted-foreground">Best streak</dt>
          <dd className="mt-1">
            <p className="text-lead font-semibold tabular-nums">
              {view.best.headline}
            </p>
            {view.best.reachedIn ? (
              <p className="text-meta text-muted-foreground mt-1">
                {view.best.reachedIn}
              </p>
            ) : null}
          </dd>
        </div>
      </dl>
    </section>
  );
}

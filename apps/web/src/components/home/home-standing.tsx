import Link from "next/link";

import { SurfaceLabel } from "~/components/common/surface-label";
import {
  homeStandingRowView,
  type HomeStandingRow,
} from "@repo/domain/home-standing";

import { standingCountLabel } from "./home-model";

export function HomeStanding({ rows }: { rows: readonly HomeStandingRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <SurfaceLabel
        meta={
          <span className="text-eyebrow font-mono uppercase">
            {standingCountLabel(rows.length)}
          </span>
        }
        className="pb-1"
      >
        Standing
      </SurfaceLabel>
      <ul className="divide-rule border-rule divide-y border-t">
        {rows.map(homeStandingRowView).map((row) => (
          <li key={row.groupId}>
            <Link
              href={`/dashboard/groups/${row.groupId}`}
              className="focus-visible:ring-ring/50 hover:bg-wash flex min-h-[52px] items-center gap-3 px-[22px] py-3 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset"
            >
              <p className="min-w-0 flex-1 truncate font-semibold">
                {row.groupName}
              </p>
              <p className="flex shrink-0 items-baseline gap-1">
                <span className="font-expanded text-title tabular-nums">
                  {row.rank}
                </span>
                <span className="text-meta text-muted-foreground">
                  {row.ofCount}
                </span>
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

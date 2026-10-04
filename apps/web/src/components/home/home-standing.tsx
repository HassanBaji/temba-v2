import Link from "next/link";

import { SurfaceLabel } from "~/components/common/surface-label";
import {
  homeStandingRowView,
  type HomeStandingRow,
} from "@repo/domain/home-standing";

export function HomeStanding({ rows }: { rows: readonly HomeStandingRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <SurfaceLabel>Standing</SurfaceLabel>
      <ul className="divide-rule divide-y">
        {rows.map(homeStandingRowView).map((row) => {
          return (
            <li key={row.groupId}>
              <Link
                href={`/dashboard/groups/${row.groupId}`}
                className="focus-visible:ring-ring/50 flex items-center gap-3 px-[22px] py-3 outline-none focus-visible:ring-[3px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.groupName}</p>
                  {row.sportLabel ? (
                    <p className="text-muted-foreground text-meta">
                      {row.sportLabel}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 tabular-nums">
                  <span className="font-expanded text-title leading-none">
                    {row.rank}
                  </span>
                  <span className="text-muted-foreground text-meta">
                    {" "}
                    {row.ofCount}
                  </span>
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

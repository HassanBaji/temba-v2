import Link from "next/link";

import { SPORT_LABELS, type SportValue } from "~/components/temba/sport-badge";

export type HomeStandingRow = {
  groupId: string;
  groupName: string | null;
  sport: string | null;
  position: number;
  memberCount: number;
};

function sportLabel(sport: string | null): string | null {
  if (sport == null || sport.trim() === "") {
    return null;
  }
  return sport in SPORT_LABELS ? SPORT_LABELS[sport as SportValue] : sport;
}

export function HomeStanding({ rows }: { rows: readonly HomeStandingRow[] }) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="border-rule bg-paper overflow-hidden rounded-xl border">
      <h2 className="text-muted-foreground text-meta px-[22px] pb-3 pt-[22px]">
        Standing
      </h2>
      <ul className="divide-rule divide-y">
        {rows.map((row) => {
          const sport = sportLabel(row.sport);
          return (
            <li key={row.groupId}>
              <Link
                href={`/dashboard/groups/${row.groupId}`}
                className="focus-visible:ring-ring/50 flex items-center gap-3 px-[22px] py-3 outline-none focus-visible:ring-[3px]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {row.groupName ?? "Group"}
                  </p>
                  {sport ? (
                    <p className="text-muted-foreground text-meta">{sport}</p>
                  ) : null}
                </div>
                <p className="shrink-0 tabular-nums">
                  <span className="font-expanded text-title leading-none">
                    #{row.position}
                  </span>
                  <span className="text-muted-foreground text-meta">
                    {" "}
                    of {row.memberCount}
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

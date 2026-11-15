"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import {
  homeStandingRowView,
  standingSplit,
  type HomeStandingRow,
} from "@repo/domain/home-standing";

import { SectionTitle } from "./section-title";

const ROW_LINK =
  "focus-visible:ring-ring/50 hover:bg-wash flex items-center gap-3 px-[18px] outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset";

export function HomeStanding({ rows }: { rows: readonly HomeStandingRow[] }) {
  const m = useMessages();
  const locale = useLocale();
  const { counted, uncounted, total } = standingSplit(rows);
  if (counted.length === 0) {
    return null;
  }
  const copy = m.home.standingSection;

  return (
    <section className="flex flex-col gap-3">
      <SectionTitle
        title={m.webAuth.home.standing}
        meta={copy.groupsOf(counted.length, total)}
      />
      <div className="border-rule bg-paper divide-rule rounded-card divide-y overflow-hidden border">
        <ul className="divide-rule divide-y">
          {counted.map((row) => {
            const view = homeStandingRowView(row, locale);
            return (
              <li key={row.groupId}>
                <Link
                  href={`/dashboard/groups/${row.groupId}`}
                  className={`${ROW_LINK} min-h-14 py-3`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {view.groupName}
                    </span>
                    {row.countedGames != null ? (
                      <span className="text-eyebrow text-muted-foreground block truncate">
                        {copy.countedGames(row.countedGames)}
                      </span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-baseline gap-1">
                    <span className="font-expanded text-title tabular-nums">
                      {view.rank}
                    </span>
                    <span className="text-meta text-muted-foreground">
                      {copy.of(row.memberCount)}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {uncounted > 0 ? (
          <Link
            href="/dashboard/groups"
            className={`${ROW_LINK} text-meta text-muted-foreground min-h-12 justify-between`}
          >
            {copy.moreGroups(uncounted)}
            <ArrowRight
              aria-hidden="true"
              className="text-ink size-4 rtl:-scale-x-100"
            />
          </Link>
        ) : null}
      </div>
    </section>
  );
}

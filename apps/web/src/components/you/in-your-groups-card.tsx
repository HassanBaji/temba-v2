"use client";

import Link from "next/link";

import { useLocale, useMessages } from "~/components/locale-provider";
import { groupHomeHref } from "~/lib/dashboard-paths";
import { type RouterOutputs } from "~/trpc/react";
import {
  inYourGroupsRows,
  type InYourGroupsRow,
} from "@repo/domain/ratings-screen";

import { InitialsTile, YouCard, YouSection } from "./you-section";

type GroupStanding = RouterOutputs["groups"]["myStandings"][number];

/** Won, lost and place in each Group, each row opening that Group. */
export function InYourGroupsList({
  rows,
}: {
  rows: readonly InYourGroupsRow[];
}) {
  return (
    <YouCard>
      <ul className="divide-rule divide-y">
        {rows.map((view) => (
          <li key={view.groupId}>
            <Link
              href={groupHomeHref(view.groupId)}
              aria-label={view.spoken}
              className="hover:bg-wash focus-visible:ring-ring/50 flex items-center gap-3 px-5 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
            >
              <InitialsTile text={view.initials} />
              <div className="min-w-0 flex-1">
                <p className="text-body text-ink truncate font-semibold">
                  {view.name}
                </p>
                <p className="text-eyebrow text-muted-foreground truncate">
                  {view.record}
                </p>
              </div>
              <span
                className={
                  view.ranked
                    ? "font-expanded text-body text-ink shrink-0 tabular-nums"
                    : "text-meta text-muted-foreground shrink-0"
                }
              >
                {view.place}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </YouCard>
  );
}

/** "In your groups": won, lost and place in each padel Group. */
export function InYourGroupsCard({ rows }: { rows: readonly GroupStanding[] }) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.rating.inYourGroups;
  if (rows.length === 0) {
    return null;
  }

  return (
    <YouSection
      title={copy.title}
      meta={copy.noTierPadel}
      note={copy.padelNote}
    >
      <InYourGroupsList rows={inYourGroupsRows(rows, locale)} />
    </YouSection>
  );
}

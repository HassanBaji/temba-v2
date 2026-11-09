"use client";

import { type TeamDetailView } from "@repo/domain/team-detail";
import { Swords } from "lucide-react";
import Link from "next/link";

import { YouCard } from "~/components/you/you-section";
import { Button } from "~/components/ui/button";

import { TeamTile } from "./team-detail-tile";

/** Rematch opens the post form for this Team, pre-filled from the Rival. */
function rematchHref(teamId: string, rivalTeamId: string) {
  return `/dashboard/challenges/new?${new URLSearchParams({ team: teamId, rematch: rivalTeamId }).toString()}`;
}

function NoRivals({
  empty,
}: {
  empty: NonNullable<TeamDetailView["rivals"]["empty"]>;
}) {
  return (
    <div className="hatch border-rule rounded-card flex items-center gap-3.5 border px-[18px] py-4">
      <div
        aria-hidden="true"
        className="bg-paper flex shrink-0 items-center rounded-[10px] p-1"
      >
        <TeamTile text={empty.initials} tone="ink" size="mini" />
        <span className="text-muted-foreground mx-1.5 text-[11px]">
          {empty.versus}
        </span>
        <TeamTile tone="empty" size="mini" />
      </div>
      <div className="bg-paper min-w-0 flex-1 rounded-[8px] px-2 py-1.5">
        <p className="text-[14px] font-semibold">{empty.title}</p>
        <p className="text-eyebrow text-muted-foreground mt-0.5">
          {empty.body}
        </p>
      </div>
    </div>
  );
}

export function TeamRivalsList({
  rivals,
  teamId,
}: {
  rivals: TeamDetailView["rivals"];
  teamId: string;
}) {
  if (rivals.empty) {
    return <NoRivals empty={rivals.empty} />;
  }
  return (
    <YouCard>
      <ul>
        {rivals.rows.map((rival, index) => (
          <li
            key={rival.teamId}
            className={
              index > 0
                ? "border-rule flex items-center gap-3 border-t px-4 py-3"
                : "flex items-center gap-3 px-4 py-3"
            }
          >
            <Link
              href={`/dashboard/teams/${rival.teamId}`}
              aria-label={rival.accessibilityLabel}
              className="focus-visible:ring-ring/50 flex min-w-0 flex-1 items-center gap-3 rounded-md outline-none focus-visible:ring-[3px]"
            >
              <TeamTile text={rival.initials} tone="ink" size="rival" />
              <span aria-hidden="true" className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="truncate text-[14px] font-semibold">
                    {rival.name}
                  </span>
                  <span
                    dir="ltr"
                    className="text-[15px] font-bold tracking-[-0.02em] [font-variation-settings:'wdth'_112,'wght'_700]"
                  >
                    {rival.headToHead}
                  </span>
                </span>
                <span className="text-eyebrow text-muted-foreground mt-0.5 block">
                  {rival.line}
                </span>
              </span>
            </Link>
            {rival.rematch ? (
              <Button
                asChild
                className="text-meta h-[34px] min-h-[34px] shrink-0 gap-1.5 rounded-[9px] px-3 font-semibold"
              >
                <Link
                  href={rematchHref(teamId, rival.teamId)}
                  aria-label={rival.rematch.accessibilityLabel}
                >
                  <Swords aria-hidden="true" className="size-[13px]" />
                  {rival.rematch.label}
                </Link>
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </YouCard>
  );
}

"use client";

import { type TeamDetailView } from "@repo/domain/team-detail";
import { Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { YouCard } from "~/components/you/you-section";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";

import { TeamTile } from "./team-detail-tile";

type Members = TeamDetailView["members"];
type MemberRemove = NonNullable<Members["rows"][number]["remove"]>;

const ROW = "flex items-center gap-3 px-4 py-3";
const RULE = "border-rule border-t";

function MemberBody({ row }: { row: Members["rows"][number] }) {
  return (
    <>
      <TeamTile
        text={row.initials}
        tone={row.isViewer ? "ink" : "paper"}
        size="member"
      />
      <span aria-hidden="true" className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">
          {row.name}
        </span>
        {row.line ? (
          <span className="text-eyebrow text-muted-foreground block">
            {row.line}
          </span>
        ) : null}
        {row.note ? (
          <span className="text-eyebrow text-muted-foreground block">
            {row.note}
          </span>
        ) : null}
      </span>
      {row.level ? (
        <span
          aria-hidden="true"
          dir="ltr"
          className="text-meta text-muted-foreground shrink-0"
        >
          {row.level}
        </span>
      ) : null}
    </>
  );
}

export function TeamRosterList({
  members,
  onOpenSeat,
  onRemove,
}: {
  members: Members;
  onOpenSeat: () => void;
  onRemove: (remove: MemberRemove) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (members.emptyCopy) {
    return (
      <p className="text-meta text-muted-foreground">{members.emptyCopy}</p>
    );
  }

  const shown = expanded
    ? members.rows
    : members.rows.slice(0, members.preview);
  const more = expanded ? null : members.more;

  return (
    <YouCard>
      <ul>
        {shown.map((row, index) => (
          <li
            key={row.id}
            className={cn("flex items-center", index > 0 && RULE)}
          >
            {row.profileUserId ? (
              <Link
                href={playerProfilePath(row.profileUserId)}
                aria-label={row.accessibilityLabel}
                className={cn(
                  ROW,
                  "hover:bg-wash focus-visible:ring-ring/50 min-w-0 flex-1 outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
                )}
              >
                <MemberBody row={row} />
              </Link>
            ) : (
              <div
                role="group"
                aria-label={row.accessibilityLabel}
                className={cn(ROW, "min-w-0 flex-1")}
              >
                <MemberBody row={row} />
              </div>
            )}
            {row.remove ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="me-1"
                aria-label={row.remove.label}
                onClick={() => {
                  if (row.remove) {
                    onRemove(row.remove);
                  }
                }}
              >
                <X aria-hidden="true" className="size-4" />
              </Button>
            ) : null}
          </li>
        ))}
        {more ? (
          <li className={RULE}>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-eyebrow text-muted-foreground hover:bg-wash focus-visible:ring-ring/50 w-full px-4 py-3 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
            >
              {more}
            </button>
          </li>
        ) : null}
        {members.openSeat ? (
          <li className={cn(ROW, RULE)}>
            <TeamTile
              tone="hatched"
              size="member"
              className="border-rule border border-dashed"
            >
              <Plus
                aria-hidden="true"
                className="text-muted-foreground size-4"
              />
            </TeamTile>
            <span className="min-w-0 flex-1">
              <span className="text-muted-foreground block text-[14px]">
                {members.openSeat.title}
              </span>
              <span className="text-eyebrow text-muted-foreground block">
                {members.openSeat.detail}
              </span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-rule text-eyebrow h-8 min-h-8 rounded-[9px] font-semibold shadow-none"
              onClick={onOpenSeat}
            >
              {members.openSeat.cta}
            </Button>
          </li>
        ) : null}
      </ul>
    </YouCard>
  );
}

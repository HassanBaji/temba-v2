"use client";

import { type TeamRosterDraftView } from "@repo/domain/team-roster-draft";
import { Plus, X } from "lucide-react";

import { TeamCreateTile } from "~/components/teams/team-create-tile";

/** New team's Roster: you, the invites waiting, the numbers you added. */
export function TeamRosterDraftList({
  roster,
  onAddMore,
  onRemove,
  disabled,
}: {
  roster: TeamRosterDraftView;
  /** Null while the add panel is already open above the list. */
  onAddMore: (() => void) | null;
  onRemove: (key: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <ul className="border-rule bg-paper rounded-card divide-rule mt-3.5 divide-y overflow-hidden border">
        {roster.rows.map((row) => (
          <li key={row.key} className="flex items-center gap-3 px-4 py-[11px]">
            <TeamCreateTile tone={row.tile}>{row.initials}</TeamCreateTile>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold leading-5">
                {row.name}
              </p>
              {row.meta ? (
                <p className="text-eyebrow text-muted-foreground">{row.meta}</p>
              ) : null}
            </div>
            <span className="text-eyebrow text-muted-foreground shrink-0 text-end leading-[1.35]">
              {row.status}
              {row.statusDetail ? (
                <>
                  <br />
                  {row.statusDetail}
                </>
              ) : null}
            </span>
            {row.removeLabel ? (
              <button
                type="button"
                aria-label={row.removeLabel}
                disabled={disabled}
                onClick={() => onRemove(row.key)}
                className="text-muted-foreground hover:text-ink focus-visible:ring-ring/50 -me-2 flex size-8 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px] disabled:opacity-50"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </li>
        ))}
        {roster.addMore && onAddMore ? (
          <li>
            <button
              type="button"
              onClick={onAddMore}
              disabled={disabled}
              className="hover:bg-wash focus-visible:ring-ring/50 flex w-full items-center gap-3 px-4 py-[11px] text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
            >
              <TeamCreateTile tone="added">
                <Plus
                  aria-hidden="true"
                  className="text-muted-foreground size-4"
                />
              </TeamCreateTile>
              <span className="text-muted-foreground flex-1 text-[14px]">
                {roster.addMore}
              </span>
            </button>
          </li>
        ) : null}
      </ul>
      {roster.fullLine ? (
        <p className="text-eyebrow text-muted-foreground mt-2.5">
          {roster.fullLine}
        </p>
      ) : null}
      {roster.footnote ? (
        <p className="text-eyebrow text-muted-foreground mt-2.5 leading-normal">
          {roster.footnote}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { SportGlyph } from "~/components/temba/sport-glyph";
import { Button } from "~/components/ui/button";
import {
  COMMUNITY_SPORTS_DESCRIPTION,
  COMMUNITY_SPORTS_TITLE,
  communitySportsView,
} from "@repo/domain/community-sports";
import type { Sport } from "@repo/domain/sport";

export function CommunitySportsBlock({
  sports,
  canManage,
  pendingSport,
  onAdd,
  onRemove,
}: {
  sports: readonly string[];
  canManage: boolean;
  pendingSport: Sport | null;
  onAdd: (sport: Sport) => void;
  onRemove: (sport: Sport) => void;
}) {
  const view = communitySportsView(sports, canManage);
  return (
    <section className="border-rule flex flex-col gap-4 rounded-[14px] border p-5">
      <div className="space-y-1">
        <h2 className="text-muted-foreground font-mono text-[11px] font-normal uppercase tracking-[0.04em]">
          {COMMUNITY_SPORTS_TITLE}
        </h2>
        <p className="text-meta text-muted-foreground">
          {COMMUNITY_SPORTS_DESCRIPTION}
        </p>
      </div>

      <ul className="divide-rule divide-y">
        {view.rows.map((row) => (
          <li
            key={row.sport}
            className="flex min-h-11 items-center justify-between gap-3 py-1"
          >
            <span className="text-body inline-flex items-center gap-2">
              <SportGlyph sport={row.sport} className="size-4" />
              {row.label}
            </span>
            {view.canRemove ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                pending={pendingSport === row.sport}
                disabled={pendingSport !== null}
                onClick={() => onRemove(row.sport)}
                aria-label={`Remove ${row.label}`}
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {view.addable.map((row) => (
        <Button
          key={row.sport}
          type="button"
          variant="outline"
          className="min-h-11 w-full"
          pending={pendingSport === row.sport}
          disabled={pendingSport !== null}
          onClick={() => onAdd(row.sport)}
        >
          Add {row.label}
        </Button>
      ))}
    </section>
  );
}

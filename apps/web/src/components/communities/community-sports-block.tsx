"use client";

import { useLocale, useMessages } from "~/components/locale-provider";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { Button } from "~/components/ui/button";
import { communitySportsView } from "@repo/domain/community-sports";
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
  const m = useMessages();
  const locale = useLocale();
  const view = communitySportsView(sports, canManage, locale);
  return (
    <section className="border-rule flex flex-col gap-4 rounded-[14px] border p-5">
      <div className="space-y-1">
        <h2 className="text-muted-foreground font-mono text-[11px] font-normal uppercase tracking-[0.04em]">
          {m.community.sports.title}
        </h2>
        <p className="text-meta text-muted-foreground">
          {m.community.sports.description}
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
                aria-label={m.webGroup.sports.removeSport(row.label)}
              >
                {m.common.remove}
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
          {m.webGroup.sports.addSport(row.label)}
        </Button>
      ))}
    </section>
  );
}

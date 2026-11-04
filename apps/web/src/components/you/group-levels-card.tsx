"use client";

import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

import { groupRowView, levelScale } from "./you-groups-model";
import { bandInText, displayBand } from "./you-format";
import type { GroupLevelRow, ScopeLevel } from "./you-hero-model";
import { InitialsTile, YouCard, YouSection } from "./you-section";

export function DifferenceBox({
  difference,
}: {
  difference: { text: string; above: boolean } | null;
}) {
  if (!difference) {
    return null;
  }
  return (
    <span
      dir="ltr"
      className={cn(
        "rounded-xs border px-1.5 font-mono text-[10px] tabular-nums leading-4",
        difference.above
          ? "border-ink text-ink"
          : "border-rule text-muted-foreground",
      )}
    >
      {difference.text}
    </span>
  );
}

function LevelScale({
  general,
  groups,
}: {
  general: number;
  groups: { groupId: string; name: string; rating: number }[];
}) {
  const m = useMessages();
  const locale = useLocale();
  const scale = levelScale(general, groups, locale);

  return (
    <div
      role="img"
      aria-label={m.webYou.scaleLabel}
      className="border-rule border-b px-5 pb-3 pt-4"
    >
      <div className="relative h-4">
        {scale.markers.map((marker) => (
          <span
            key={marker.key}
            className={cn(
              "absolute top-0 -translate-x-1/2 font-mono text-[9px] rtl:translate-x-1/2",
              marker.general
                ? "text-ink font-semibold"
                : "text-muted-foreground",
            )}
            style={{ insetInlineStart: `${marker.position}%` }}
          >
            {marker.tag}
          </span>
        ))}
      </div>
      <div className="relative mt-1 h-4">
        <span className="hatch absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full" />
        {scale.ticks.map((tick) => (
          <span
            key={tick.label}
            className="bg-rule absolute top-0 h-full w-px"
            style={{ insetInlineStart: `${tick.position}%` }}
          />
        ))}
        {scale.markers.map((marker) => (
          <span
            key={marker.key}
            className={cn(
              "border-ink absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 rtl:translate-x-1/2",
              marker.general ? "bg-ink size-4" : "bg-paper size-3",
            )}
            style={{ insetInlineStart: `${marker.position}%` }}
          />
        ))}
      </div>
      <div className="relative mt-1 h-3">
        {scale.ticks.map((tick, index) => (
          <span
            key={tick.label}
            className={cn(
              "text-muted-foreground absolute top-0 font-mono text-[9px]",
              index === 0
                ? ""
                : index === scale.ticks.length - 1
                  ? "-translate-x-full rtl:translate-x-full"
                  : "-translate-x-1/2 rtl:translate-x-1/2",
            )}
            style={{ insetInlineStart: `${tick.position}%` }}
          >
            <span dir="ltr">{tick.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** "Levels by group" on the General scope: each Group Level against General. */
export function GroupLevelsCard({
  general,
  rows,
}: {
  general: ScopeLevel | null;
  rows: readonly GroupLevelRow[];
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.you.groups;
  const generalRating = general?.rating ?? null;
  const views = rows.map((row) => groupRowView(row, locale));

  return (
    <YouSection
      title={copy.title}
      meta={
        general
          ? copy.vsGeneral(
              bandInText(displayBand(general.levelBand), locale),
              general.rating.toFixed(2),
            )
          : null
      }
      note={rows.length > 0 ? copy.note : null}
    >
      {rows.length === 0 ? (
        <YouCard className="text-meta text-muted-foreground px-5 py-4 leading-[1.5]">
          {copy.empty}
        </YouCard>
      ) : (
        <YouCard>
          {generalRating !== null ? (
            <LevelScale
              general={generalRating}
              groups={rows.map((row) => ({
                groupId: row.groupId,
                name: row.name,
                rating: row.rating,
              }))}
            />
          ) : null}
          <ul className="divide-rule divide-y">
            {views.map((view) => (
              <li
                key={view.groupId}
                className="flex items-center gap-3 px-5 py-3"
              >
                <InitialsTile text={view.initials} hatched={view.provisional} />
                <div className="min-w-0 flex-1">
                  <p className="text-body text-ink truncate font-semibold">
                    {view.name}
                  </p>
                  <p className="text-eyebrow text-muted-foreground truncate">
                    {view.sub}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <p className="flex items-baseline gap-1.5">
                    <span dir="ltr" className="font-expanded text-body">
                      {view.band}
                    </span>
                    <span className="text-meta text-muted-foreground tabular-nums">
                      {view.level}
                    </span>
                  </p>
                  <DifferenceBox difference={view.difference} />
                </div>
              </li>
            ))}
          </ul>
        </YouCard>
      )}
    </YouSection>
  );
}

"use client";

import { UserAvatar } from "~/components/common/user-avatar";
import { useMessages } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

import { CoinStack } from "./coin-stack";
import type { CandidateRow } from "./marks-model";

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border",
        selected ? "bg-ink border-ink" : "bg-sheet border-input",
      )}
    >
      {selected ? <span className="bg-paper size-2 rounded-full" /> : null}
    </span>
  );
}

/** The MVP sheets' radio rows (2d, 2e): one participant each, with hints. */
export function CandidateList({
  label,
  rows,
  selected,
  trailing,
  onSelect,
}: {
  label: string;
  rows: CandidateRow[];
  selected: string | null;
  trailing: "coins" | "marks";
  onSelect: (userId: string) => void;
}) {
  const m = useMessages();
  return (
    <RovingRadioGroup
      aria-label={label}
      className="border-rule rounded-card overflow-hidden border"
    >
      {rows.map((row) => {
        const on = row.userId === selected;
        return (
          <button
            key={row.userId}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={[
              row.name,
              row.sub,
              trailing === "marks" ? row.marks : null,
            ]
              .filter(Boolean)
              .join(m.common.listSeparator)}
            onClick={() => onSelect(row.userId)}
            className={cn(
              "border-rule flex min-h-14 w-full items-center gap-3 border-t px-3.5 py-2.5 text-start outline-none first:border-t-0",
              "hover:bg-wash focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-inset",
              on ? "bg-wash" : "bg-sheet",
            )}
          >
            <RadioDot selected={on} />
            <UserAvatar name={row.name} image={row.image} />
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "text-meta block truncate",
                  on && "font-semibold",
                )}
              >
                {row.name}
              </span>
              {row.sub ? (
                <span className="text-muted-foreground text-eyebrow block truncate">
                  {row.sub}
                </span>
              ) : null}
            </span>
            {trailing === "coins" ? (
              <CoinStack kinds={row.coins} size="row" />
            ) : (
              <span className="text-muted-foreground text-eyebrow shrink-0">
                {row.marks}
              </span>
            )}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}

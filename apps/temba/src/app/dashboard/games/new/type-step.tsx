import { ChevronRight, Shuffle, Trophy } from "lucide-react";

import { cn } from "~/lib/utils";
import {
  CREATE_GAME_TYPE_CARDS,
  type CreateGameTypeId,
} from "~/lib/create-game-flow";

const ICONS = {
  friendly_game: Shuffle,
  friendly_tournament: Trophy,
} as const;

export function TypeStep({
  selectedType,
  error,
  onSelect,
}: {
  selectedType: CreateGameTypeId | null;
  error?: string;
  onSelect: (type: CreateGameTypeId) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div
        id="game-type"
        role="radiogroup"
        aria-label="Game type"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "game-type-error" : undefined}
        tabIndex={-1}
        className="flex flex-col gap-3 outline-none"
      >
        {CREATE_GAME_TYPE_CARDS.map((card) => {
          const selected = selectedType === card.id;
          const Icon = ICONS[card.id];
          return (
            <button
              key={card.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                onSelect(card.id);
              }}
              className={cn(
                "focus-visible:ring-ring/50 flex min-h-11 w-full flex-col gap-3.5 rounded-[14px] border p-5 text-left outline-none focus-visible:ring-[3px]",
                selected
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-paper text-ink hover:bg-wash",
              )}
            >
              <span className="flex w-full items-center gap-3">
                <span
                  className={cn(
                    "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border",
                    selected
                      ? "border-dimrule bg-raised"
                      : "border-rule bg-paper",
                  )}
                >
                  <Icon aria-hidden="true" className="size-[17px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold">
                    {card.title}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs",
                      selected ? "text-dim" : "text-muted-foreground",
                    )}
                  >
                    {card.description}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className={cn(
                    "size-[18px] shrink-0",
                    selected ? "text-dim" : "text-muted-foreground",
                  )}
                />
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-wide",
                  selected ? "text-dim" : "text-muted-foreground",
                )}
              >
                {card.rating}
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p
          id="game-type-error"
          role="alert"
          className="text-destructive text-sm"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

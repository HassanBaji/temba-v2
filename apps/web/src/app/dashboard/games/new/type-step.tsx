import { Shuffle, Trophy } from "lucide-react";

import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { SelectCard, SelectCardNote } from "~/components/ui/select-card";
import {
  CREATE_GAME_TYPE_CARDS,
  type CreateGameTypeId,
} from "@repo/domain/create-game-flow";

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
      <RovingRadioGroup
        id="game-type"
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
            <SelectCard
              key={card.id}
              role="radio"
              selected={selected}
              icon={<Icon className="size-[17px]" />}
              title={card.title}
              description={card.description}
              trailing="chevron"
              onClick={() => {
                onSelect(card.id);
              }}
            >
              <SelectCardNote>{card.rating}</SelectCardNote>
            </SelectCard>
          );
        })}
      </RovingRadioGroup>
      {error ? (
        <p
          id="game-type-error"
          role="alert"
          className="text-destructive text-meta"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

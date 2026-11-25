import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { useLocale, useMessages } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { FieldDescription } from "~/components/ui/field";
import {
  GAME_GENDER_TAGS,
  gameGenderTagLabel,
  type GameGenderTag,
} from "@repo/domain/game-gender-tag";

/** Create step 4: the optional Gender tag. Picking the chosen chip again clears it. */
export function GenderTagField({
  idPrefix,
  genderTag,
  onGenderTag,
}: {
  idPrefix: string;
  genderTag: GameGenderTag | null;
  onGenderTag: (genderTag: GameGenderTag | null) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        id={`${idPrefix}-gender-tag-label`}
        title={m.createGame.genderTag.title}
        meta={m.common.optional}
      />
      <div
        role="group"
        aria-labelledby={`${idPrefix}-gender-tag-label`}
        aria-describedby={`${idPrefix}-gender-tag-help`}
        className="grid grid-cols-3 gap-1.5"
      >
        {GAME_GENDER_TAGS.map((option) => {
          const selected = genderTag === option;
          return (
            <ChoiceChip
              key={option}
              selected={selected}
              aria-pressed={selected}
              onClick={() => {
                onGenderTag(selected ? null : option);
              }}
            >
              {gameGenderTagLabel(option, locale)}
            </ChoiceChip>
          );
        })}
      </div>
      <FieldDescription id={`${idPrefix}-gender-tag-help`}>
        {m.createGame.genderTag.help}
      </FieldDescription>
    </section>
  );
}

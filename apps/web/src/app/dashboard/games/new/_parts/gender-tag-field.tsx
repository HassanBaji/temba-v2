import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { GenderTagChoices } from "~/components/games/gender-tag";
import { useMessages } from "~/components/locale-provider";
import { FieldDescription } from "~/components/ui/field";
import type { GameGenderTag } from "@repo/domain/game-gender-tag";

/** Create step 4: the optional Gender tag. */
export function GenderTagField({
  idPrefix,
  genderTag,
  onGenderTag,
}: {
  idPrefix: string;
  genderTag: GameGenderTag | null;
  onGenderTag: (genderTag: GameGenderTag | null) => void;
}) {
  const m = useMessages();
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading
        id={`${idPrefix}-gender-tag-label`}
        title={m.createGame.genderTag.title}
        meta={m.common.optional}
      />
      <GenderTagChoices
        labelledBy={`${idPrefix}-gender-tag-label`}
        describedBy={`${idPrefix}-gender-tag-help`}
        genderTag={genderTag}
        onGenderTag={onGenderTag}
      />
      <FieldDescription id={`${idPrefix}-gender-tag-help`}>
        {m.createGame.genderTag.help}
      </FieldDescription>
    </section>
  );
}

import { SectionHeading } from "~/app/dashboard/games/new/_parts/section-heading";
import { useLocale } from "~/components/locale-provider";
import { FieldDescription } from "~/components/ui/field";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { SelectCard } from "~/components/ui/select-card";
import { createRatingChoice } from "@repo/domain/create-game-flow";
import type { Sport } from "@repo/domain/sport";

export function RatingField({
  idPrefix,
  groupVerified,
  sport,
  rated,
  onRated,
}: {
  idPrefix: string;
  groupVerified: boolean;
  sport?: Sport;
  rated: boolean;
  onRated: (rated: boolean) => void;
}) {
  const locale = useLocale();
  const choice = createRatingChoice({ groupVerified, rated, locale, sport });
  return (
    <section className="flex flex-col gap-3">
      <SectionHeading id={`${idPrefix}-rating-label`} title={choice.title} />
      <RovingRadioGroup
        id={`${idPrefix}-rating`}
        aria-labelledby={`${idPrefix}-rating-label`}
        aria-describedby={`${idPrefix}-rating-note`}
        tabIndex={-1}
        className="border-rule rounded-card flex flex-col overflow-hidden border outline-none"
      >
        {choice.options.map((option) => (
          <SelectCard
            key={String(option.rated)}
            role="radio"
            layout="row"
            selected={rated === option.rated}
            title={option.label}
            description={option.description}
            trailing="check"
            onClick={() => {
              onRated(option.rated);
            }}
          />
        ))}
      </RovingRadioGroup>
      <FieldDescription id={`${idPrefix}-rating-note`}>
        {choice.note}
      </FieldDescription>
    </section>
  );
}

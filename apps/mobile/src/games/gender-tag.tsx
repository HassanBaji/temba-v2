import { gameGenderTagLabel } from "@repo/domain/game-gender-tag";

import { ChallengeTag } from "../game-details/challenge-tag";
import { useLocale } from "../i18n/locale-provider";

/** The Gender tag on a Game card or in the head of Game details. Renders nothing on an untagged Game. */
export function GenderTag({
  genderTag,
}: {
  genderTag: string | null | undefined;
}) {
  const locale = useLocale();
  const label = gameGenderTagLabel(genderTag, locale);
  return label ? <ChallengeTag label={label} /> : null;
}

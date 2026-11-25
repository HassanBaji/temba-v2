import {
  GAME_GENDER_TAGS,
  gameGenderTagLabel,
  type GameGenderTag,
} from "@repo/domain/game-gender-tag";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { ChipGrid } from "./chips";
import type { ReviewRow } from "./review-card";
import type { StepProps } from "./step-props";
import { HelperNote, StepSection } from "./step-section";

const GENDER_TAG_COLUMNS = 3;

/** The optional Gender tag. Picking the chosen chip again clears it. */
export function GenderTagField({ state, dispatch }: StepProps) {
  const locale = useLocale();
  const m = useMessages();
  const copy = m.createGame.genderTag;
  const { genderTag } = state.draft;
  return (
    <StepSection title={copy.title} note={m.common.optional}>
      <ChipGrid
        label={copy.title}
        columns={GENDER_TAG_COLUMNS}
        multiple
        chips={GAME_GENDER_TAGS.map((tag) => ({
          value: tag,
          label: copy[tag],
        }))}
        isSelected={(tag) => tag === genderTag}
        onSelect={(tag) =>
          dispatch({
            kind: "setGenderTag",
            genderTag: tag === genderTag ? null : tag,
          })
        }
      />
      <HelperNote>{copy.help}</HelperNote>
    </StepSection>
  );
}

export function genderTagReviewRows(
  genderTag: GameGenderTag | null,
  locale: Locale,
): ReviewRow[] {
  const value = gameGenderTagLabel(genderTag, locale);
  return value
    ? [{ label: messagesFor(locale).createGame.genderTag.title, value }]
    : [];
}

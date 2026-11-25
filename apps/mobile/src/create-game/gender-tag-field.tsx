import {
  GAME_GENDER_TAGS,
  gameGenderTagLabel,
  type GameGenderTag,
} from "@repo/domain/game-gender-tag";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { useMessages } from "../i18n/locale-provider";
import { ChipGrid } from "./chips";
import type { ReviewRow } from "./review-card";
import type { StepProps } from "./step-props";
import { HelperNote, StepSection } from "./step-section";

const GENDER_TAG_COLUMNS = 3;

/** The three Gender tags as chips. Picking the chosen chip again clears it. */
export function GenderTagChoices({
  genderTag,
  onSelect,
}: {
  genderTag: GameGenderTag | null;
  onSelect: (genderTag: GameGenderTag | null) => void;
}) {
  const copy = useMessages().createGame.genderTag;
  return (
    <ChipGrid
      label={copy.title}
      columns={GENDER_TAG_COLUMNS}
      multiple
      chips={GAME_GENDER_TAGS.map((tag) => ({
        value: tag,
        label: copy[tag],
      }))}
      isSelected={(tag) => tag === genderTag}
      onSelect={(tag) => onSelect(tag === genderTag ? null : tag)}
    />
  );
}

/** The optional Gender tag on the create details step. */
export function GenderTagField({ state, dispatch }: StepProps) {
  const m = useMessages();
  const copy = m.createGame.genderTag;
  return (
    <StepSection title={copy.title} note={m.common.optional}>
      <GenderTagChoices
        genderTag={state.draft.genderTag}
        onSelect={(genderTag) => dispatch({ kind: "setGenderTag", genderTag })}
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

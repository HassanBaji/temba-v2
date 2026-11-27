"use client";

import {
  GAME_GENDER_TAGS,
  gameGenderTagLabel,
  type GameGenderTag,
} from "@repo/domain/game-gender-tag";
import type { SurfaceTone } from "@repo/domain/surface-tone";

import { ChallengeTag } from "~/components/games/challenge-tag";
import { useLocale } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Badge } from "~/components/ui/badge";

/** The three Gender tags as chips. Picking the chosen chip again clears it. */
export function GenderTagChoices({
  labelledBy,
  describedBy,
  genderTag,
  onGenderTag,
}: {
  labelledBy: string;
  describedBy?: string;
  genderTag: GameGenderTag | null;
  onGenderTag: (genderTag: GameGenderTag | null) => void;
}) {
  const locale = useLocale();
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
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
  );
}

/** The Gender tag on a Game card. Renders nothing on an untagged Game. */
export function GenderTagBadge({
  genderTag,
}: {
  genderTag: string | null | undefined;
}) {
  const locale = useLocale();
  const label = gameGenderTagLabel(genderTag, locale);
  return label ? (
    <Badge variant="outline" data-slot="game-gender-tag">
      {label}
    </Badge>
  ) : null;
}

/** The Gender tag in the head of Game details. Renders nothing on an untagged Game. */
export function GenderHeroTag({
  genderTag,
  tone,
}: {
  genderTag: string | null | undefined;
  tone: SurfaceTone;
}) {
  const locale = useLocale();
  const label = gameGenderTagLabel(genderTag, locale);
  return label ? <ChallengeTag label={label} tone={tone} /> : null;
}

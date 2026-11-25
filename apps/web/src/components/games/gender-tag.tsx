"use client";

import { gameGenderTagLabel } from "@repo/domain/game-gender-tag";
import type { SurfaceTone } from "@repo/domain/surface-tone";

import { ChallengeTag } from "~/components/games/challenge-tag";
import { useLocale } from "~/components/locale-provider";
import { Badge } from "~/components/ui/badge";

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

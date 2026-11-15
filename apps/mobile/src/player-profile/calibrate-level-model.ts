import {
  levelFaceFor,
  ovrFromLevel,
  type LevelFace,
} from "@repo/domain/football-ovr";
import {
  levelSliderLabel,
  levelSliderStartTenths,
  ovrSliderStart,
  ovrSliderValueText,
} from "@repo/domain/level-slider";
import type { Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { firstName } from "../groups/group-home-model";

/** The player's Level as `users.playerProfile` or `users.footballProfile` reads it. */
export type CalibrateRating = {
  level: string;
  levelValue: number;
  provisional: boolean;
} | null;

export type CalibrateLevelView = {
  face: LevelFace;
  currentValue: number;
  wasLabel: string;
  alreadyConfirmed: boolean;
  note: string;
};

/** The start of a Verifier's calibration: football in OVR, padel in tenths. */
export function calibrateLevelView(
  args: { name: string; sport: Sport; rating: CalibrateRating },
  locale: Locale,
): CalibrateLevelView {
  const m = messagesFor(locale).mobileGroup.setLevel;
  const face = levelFaceFor(args.sport);
  const rating = args.rating;
  const currentValue =
    face === "ovr"
      ? ovrSliderStart(
          rating ? Math.round(ovrFromLevel(rating.levelValue)) : null,
        )
      : levelSliderStartTenths(rating?.level ?? null);
  return {
    face,
    currentValue,
    wasLabel: rating
      ? m.was(calibrateLevelLabel(face, currentValue, locale))
      : m.noLevelYet,
    alreadyConfirmed: rating !== null && !rating.provisional,
    note: [
      m.note,
      rating?.provisional ? m.noteProvisional(firstName(args.name)) : null,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

/** `OVR 72` on football, with no band; `C+ 3.2` on padel. */
export function calibrateLevelLabel(
  face: LevelFace,
  value: number,
  locale: Locale,
) {
  return face === "ovr"
    ? ovrSliderValueText(value, locale)
    : levelSliderLabel(value);
}

export function calibrateLevelUnchanged(
  view: CalibrateLevelView,
  value: number,
) {
  return view.alreadyConfirmed && value === view.currentValue;
}

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/**
 * Preferred Position display: a User's standing preference for Left or Right,
 * or Either. The stored values are the `user_preferred_position` enum
 * (`left` / `right` / `either`) plus null, which means unanswered — a User
 * backfilled by the Onboarding questionnaire migration reads null until they
 * answer on You.
 *
 * One display map, the way `level-bands` owns the Level band one. Read the
 * labels from here rather than writing a second table next to a picker.
 *
 * The list is pinned to the schema enum by `preferred-position-schema.test.ts`
 * in the web App: this Package cannot import `@repo/db`.
 */
export const PREFERRED_POSITIONS = ["left", "right", "either"] as const;

export type PreferredPosition = (typeof PREFERRED_POSITIONS)[number];

/** Narrows a stored column value onto the enum; anything else is unanswered. */
export function isPreferredPosition(
  value: string | null | undefined,
): value is PreferredPosition {
  return PREFERRED_POSITIONS.includes(value as PreferredPosition);
}

/** The answer as a person reads it, or `Not set` when there is no answer. */
export function preferredPositionLabel(
  value: string | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale);
  return isPreferredPosition(value)
    ? m.profile.preferredPosition[value]
    : m.common.notSet;
}

/** Settings note line: how Preferred Position seeds partner-register side. */
export function preferredPositionNote(
  value: string | null | undefined,
  locale: Locale,
) {
  const m = messagesFor(locale).profile.preferredPosition.note;
  return isPreferredPosition(value) ? m[value] : m.unset;
}

export function preferredPositionProfileLine(
  value: string | null | undefined,
  locale: Locale,
) {
  return isPreferredPosition(value)
    ? messagesFor(locale).profile.preferredPosition.line[value]
    : null;
}

/** The choices the picker offers. `Not set` is absent: it is not an answer. */
export function preferredPositionChoices(locale: Locale): {
  value: PreferredPosition;
  label: string;
}[] {
  const m = messagesFor(locale).profile.preferredPosition;
  return PREFERRED_POSITIONS.map((value) => ({ value, label: m[value] }));
}

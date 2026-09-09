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
 * The list is pinned to the schema enum by the `satisfies` below, so adding,
 * dropping or reordering `USER_PREFERRED_POSITION_VALUES` is a type error here
 * until this file follows. The bind is type-only on purpose: this module is
 * client-reachable and `@repo/db` opens a database connection when imported.
 */
export const PREFERRED_POSITIONS = [
  "left",
  "right",
  "either",
] as const satisfies typeof import("@repo/db/schema").USER_PREFERRED_POSITION_VALUES;

export type PreferredPosition = (typeof PREFERRED_POSITIONS)[number];

/** What an unanswered Preferred Position reads as. */
export const PREFERRED_POSITION_UNSET_LABEL = "Not set";

const PREFERRED_POSITION_LABELS: Record<PreferredPosition, string> = {
  left: "Left",
  right: "Right",
  either: "Either",
};

/** Narrows a stored column value onto the enum; anything else is unanswered. */
export function isPreferredPosition(
  value: string | null | undefined,
): value is PreferredPosition {
  return PREFERRED_POSITIONS.includes(value as PreferredPosition);
}

/** The answer as a person reads it, or `Not set` when there is no answer. */
export function preferredPositionLabel(value: string | null | undefined) {
  return isPreferredPosition(value)
    ? PREFERRED_POSITION_LABELS[value]
    : PREFERRED_POSITION_UNSET_LABEL;
}

/** The choices the picker offers. `Not set` is absent: it is not an answer. */
export const PREFERRED_POSITION_CHOICES: {
  value: PreferredPosition;
  label: string;
}[] = PREFERRED_POSITIONS.map((value) => ({
  value,
  label: PREFERRED_POSITION_LABELS[value],
}));

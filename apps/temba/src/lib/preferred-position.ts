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

const PREFERRED_POSITION_PROFILE_LINES: Record<PreferredPosition, string> = {
  left: "Left side",
  right: "Right side",
  either: "Either side",
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

const PREFERRED_POSITION_UNSET_NOTE =
  "Not set. We start you on the left when you register with a partner.";

const PREFERRED_POSITION_NOTES: Record<PreferredPosition, string> = {
  left: "We start you on the left when you register with a partner.",
  right: "We start you on the right when you register with a partner.",
  either: "Either side. Your partner's preference decides.",
};

/** Settings note line: how Preferred Position seeds partner-register side. */
export function preferredPositionNote(value: string | null | undefined) {
  return isPreferredPosition(value)
    ? PREFERRED_POSITION_NOTES[value]
    : PREFERRED_POSITION_UNSET_NOTE;
}

export function preferredPositionProfileLine(value: string | null | undefined) {
  return isPreferredPosition(value)
    ? PREFERRED_POSITION_PROFILE_LINES[value]
    : null;
}

/** The choices the picker offers. `Not set` is absent: it is not an answer. */
export const PREFERRED_POSITION_CHOICES: {
  value: PreferredPosition;
  label: string;
}[] = PREFERRED_POSITIONS.map((value) => ({
  value,
  label: PREFERRED_POSITION_LABELS[value],
}));

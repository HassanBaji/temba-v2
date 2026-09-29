export function rovingRadioIndex(
  key: string,
  currentIndex: number,
  count: number,
): number | null {
  if (count <= 0) {
    return null;
  }
  const last = count - 1;
  switch (key) {
    case "Home":
      return 0;
    case "End":
      return last;
    case "ArrowLeft":
    case "ArrowUp":
      return currentIndex <= 0 ? last : currentIndex - 1;
    case "ArrowRight":
    case "ArrowDown":
      return currentIndex < 0 || currentIndex >= last ? 0 : currentIndex + 1;
    default:
      return null;
  }
}

export type RovingRadioState = {
  checked: boolean;
  /** Neither `disabled` nor `aria-disabled`. */
  enabled: boolean;
  /** Not natively `disabled`, so it can still hold focus. */
  focusable: boolean;
};

/**
 * Which radio carries the group's single tab stop. An `aria-disabled` group
 * (for example while a choice is saving) keeps a stop on its checked radio so
 * focus is not dropped to the page.
 */
export function rovingTabStopIndex(radios: RovingRadioState[]): number {
  const candidates = [
    (radio: RovingRadioState) => radio.enabled && radio.checked,
    (radio: RovingRadioState) => radio.enabled,
    (radio: RovingRadioState) => radio.focusable && radio.checked,
    (radio: RovingRadioState) => radio.focusable,
  ];
  for (const matches of candidates) {
    const index = radios.findIndex(matches);
    if (index !== -1) {
      return index;
    }
  }
  return -1;
}

export type TextDirectionStyle = {
  textAlign: "left" | "right";
  writingDirection: "ltr" | "rtl";
};

/**
 * Fabric swaps `textAlign: "left"` to right on a `Text` laid out RTL, so
 * "left" is the start side in both directions. Without it iOS aligns by the
 * device language, not the layout.
 */
export function textDirectionStyle(
  layoutRtl: boolean,
  ltr = false,
): TextDirectionStyle {
  return {
    textAlign: "left",
    writingDirection: layoutRtl && !ltr ? "rtl" : "ltr",
  };
}

/**
 * iOS `TextInput` builds its paragraph style from props alone, without the
 * layout direction, so it never swaps `textAlign`: the start side is named
 * physically. An LTR value (phone, email, code, URL) sits at the left.
 */
export function inputDirectionStyle(
  layoutRtl: boolean,
  ltr = false,
): TextDirectionStyle {
  const rtl = layoutRtl && !ltr;
  return {
    textAlign: rtl ? "right" : "left",
    writingDirection: rtl ? "rtl" : "ltr",
  };
}

export type TextWeight = "regular" | "medium" | "semibold" | "bold";
export type TextWidth = "normal" | "expanded";

const BODY_FAMILIES: Record<TextWeight, string> = {
  regular: "Archivo-Regular",
  medium: "Archivo-Medium",
  semibold: "Archivo-SemiBold",
  bold: "Archivo-Bold",
};

const ARABIC_LETTER = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

export function containsArabic(children: unknown): boolean {
  if (typeof children === "string") {
    return ARABIC_LETTER.test(children);
  }
  if (Array.isArray(children)) {
    return children.some(containsArabic);
  }
  if (
    typeof children === "object" &&
    children !== null &&
    "props" in children
  ) {
    const props = children.props;
    return (
      typeof props === "object" &&
      props !== null &&
      "children" in props &&
      containsArabic(props.children)
    );
  }
  return false;
}

/**
 * Arabic inside a monospaced run gets one fixed advance per glyph and loses its
 * letter joins, so Arabic content takes the body family instead.
 */
export function fontFamilyFor(options: {
  weight: TextWeight;
  width: TextWidth;
  mono: boolean;
  arabic?: boolean;
}): string {
  if (options.mono && !options.arabic) {
    return "GeistMono-Regular";
  }
  if (options.width === "expanded" && !options.mono) {
    return "ArchivoExpanded-Bold";
  }
  return BODY_FAMILIES[options.weight];
}

export type TextWeight = "regular" | "medium" | "semibold" | "bold";
export type TextWidth = "normal" | "expanded";

const BODY_FAMILIES: Record<TextWeight, string> = {
  regular: "Archivo-Regular",
  medium: "Archivo-Medium",
  semibold: "Archivo-SemiBold",
  bold: "Archivo-Bold",
};

export function fontFamilyFor(options: {
  weight: TextWeight;
  width: TextWidth;
  mono: boolean;
}): string {
  if (options.mono) {
    return "GeistMono-Regular";
  }
  if (options.width === "expanded") {
    return "ArchivoExpanded-Bold";
  }
  return BODY_FAMILIES[options.weight];
}

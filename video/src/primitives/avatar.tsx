import type { CSSProperties } from "react";

import { c, font } from "../theme";

function initialsFor(name: string): string {
  // An Arabic family name's article ("ال") is not its initial.
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.startsWith("ال") && word.length > 3 ? word.slice(2) : word));
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

const arabic = /[؀-ۿ]/;

/** The app's initials avatar: wash disc, hairline edge. `solid` is a filled seat. */
export function Avatar({
  name,
  size = 40,
  solid = false,
  style,
}: {
  name: string;
  size?: number;
  solid?: boolean;
  style?: CSSProperties;
}) {
  const isArabic = arabic.test(name);
  // Arabic initials join if adjacent; a thin space keeps them as two letters.
  const label = isArabic ? initialsFor(name).split("").join("‌") : initialsFor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: solid ? c.ink : c.wash,
        border: `1px solid ${solid ? c.ink : c.rule}`,
        color: solid ? c.paper : c.ink,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontFamily: isArabic ? font.arabic : font.sans,
        fontWeight: 600,
        fontSize: size * (isArabic ? 0.36 : 0.34),
        lineHeight: 1,
        direction: isArabic ? "rtl" : "ltr",
        ...style,
      }}
    >
      {label}
    </div>
  );
}

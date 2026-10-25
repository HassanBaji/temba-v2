import { CircleDot, Goal } from "lucide-react";

import { sportGlyph } from "@repo/domain/sport";

export function SportGlyph({
  sport,
  className,
}: {
  sport: string;
  className?: string;
}) {
  const glyph = sportGlyph(sport);
  if (glyph === "goal") {
    return <Goal aria-hidden="true" className={className} />;
  }
  if (glyph === "circle-dot") {
    return <CircleDot aria-hidden="true" className={className} />;
  }
  return null;
}

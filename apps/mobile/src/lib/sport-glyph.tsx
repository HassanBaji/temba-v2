import { sizes } from "@repo/design-tokens";
import { sportGlyph } from "@repo/domain/sport";
import { CircleDot, Goal } from "lucide-react-native";

export function SportGlyph({
  sport,
  color,
  size = sizes.iconAction,
}: {
  sport: string | null;
  color: string;
  size?: number;
}) {
  const glyph = sportGlyph(sport);
  if (glyph === "goal") {
    return <Goal size={size} color={color} />;
  }
  if (glyph === "circle-dot") {
    return <CircleDot size={size} color={color} />;
  }
  return null;
}

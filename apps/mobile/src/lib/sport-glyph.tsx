import { sizes } from "@repo/design-tokens";
import { sportGlyph } from "@repo/domain/sport";
import Svg, { Circle, Path } from "react-native-svg";

const STROKE = 1.8;
const DOT_STROKE = 2.2;

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
    return <FootballIcon size={size} color={color} />;
  }
  if (glyph === "circle-dot") {
    return <PadelIcon size={size} color={color} />;
  }
  return null;
}

function PadelIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 1.5c4.2 0 7 3.3 7 7.5 0 3.6-2.3 6.4-5.3 7.1v2.4a1.7 1.7 0 0 1-3.4 0v-2.4C7.3 15.4 5 12.6 5 9c0-4.2 2.8-7.5 7-7.5Z" />
      <Path
        d="M9.6 6.6h.01M12 6.6h.01M14.4 6.6h.01M9.6 9.3h.01M12 9.3h.01M14.4 9.3h.01M10.8 12h.01M13.2 12h.01"
        strokeWidth={DOT_STROKE}
      />
      <Path d="M10 20.5h4" />
    </Svg>
  );
}

function FootballIcon({ size, color }: { size: number; color: string }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="10" />
      <Path
        d="M12 8l3.8 2.76-1.45 4.48h-4.7L8.2 10.76Z"
        fill={color}
        stroke="none"
      />
      <Path d="M12 8V2M15.8 10.76l5.7-1.86M14.35 15.24l3.55 4.86M9.65 15.24 6.1 20.1M8.2 10.76 2.5 8.9" />
    </Svg>
  );
}

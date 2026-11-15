import Svg, { Circle, Path, Rect } from "react-native-svg";

const STROKE = 1.8;

/** A pitch seen from above: a request for a seat in a Game. */
export function SeatGlyph({ color, size }: { color: string; size: number }) {
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
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M12 5v14" />
      <Circle cx="12" cy="12" r="2.6" />
    </Svg>
  );
}

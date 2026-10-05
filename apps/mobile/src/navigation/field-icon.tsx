import type { ColorValue } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export function FieldIcon({
  size,
  color,
  strokeWidth = 2,
}: {
  size: number;
  color: ColorValue;
  strokeWidth?: number;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Rect x="2" y="4" width="20" height="16" rx="2" />
      <Path d="M12 4v16" />
      <Circle cx="12" cy="12" r="3" />
    </Svg>
  );
}

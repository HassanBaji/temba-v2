import { c, resultMark } from "../theme";

/**
 * The Temba ball: the brand mark's paper disc and seam arc, with the right
 * side shaded by the 45° hatch so it reads as a sphere.
 */
export function BallMark({ size, seam = 1 }: { size: number; seam?: number }) {
  const { cx, cy, r } = resultMark.wonDisc;
  const arcLength = 110;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <clipPath id="ball-disc">
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <mask id="ball-shade">
          <rect width="100" height="100" fill="black" />
          <circle cx={cx} cy={cy} r={r} fill="white" />
          <circle cx={cx - 17} cy={cy - 6} r={r - 2} fill="black" />
        </mask>
        <pattern id="ball-hatch" patternUnits="userSpaceOnUse" width="4.2" height="4.2" patternTransform="rotate(45)">
          <rect width="1.25" height="4.2" fill={c.ink} />
        </pattern>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={c.paper} />
      <rect width="100" height="100" fill="url(#ball-hatch)" mask="url(#ball-shade)" clipPath="url(#ball-disc)" />
      <path
        d={resultMark.arc}
        fill="none"
        stroke={c.ink}
        strokeWidth={6}
        clipPath="url(#ball-disc)"
        strokeDasharray={arcLength}
        strokeDashoffset={arcLength * (1 - seam)}
      />
    </svg>
  );
}

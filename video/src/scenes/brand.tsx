import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { BallMark } from "../primitives/ball-mark";
import { c, font, snappy } from "../theme";

/** Ball mark over the TEMBA wordmark, on ink. */
export function BrandLockup({
  markSize,
  wordSize,
  markAt = 0,
  wordAt = 18,
}: {
  markSize: number;
  wordSize: number;
  markAt?: number;
  wordAt?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = spring({ frame: frame - markAt, fps, config: { damping: 18, stiffness: 140, mass: 0.8 } });
  const seam = spring({ frame: frame - markAt - 8, fps, config: snappy, durationInFrames: 22 });
  const turn = interpolate(mark, [0, 1], [-50, 0]);
  const word = spring({ frame: frame - wordAt, fps, config: snappy, durationInFrames: 26 });
  const tracking = interpolate(word, [0, 1], [0.42, 0.2]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ transform: `scale(${mark}) rotate(${turn}deg)` }}>
        <BallMark size={markSize} seam={seam} />
      </div>
      <div
        style={{
          marginTop: markSize * 0.22,
          fontFamily: font.display,
          fontWeight: 300,
          fontSize: wordSize,
          lineHeight: 1.1,
          letterSpacing: `${tracking}em`,
          marginRight: `-${tracking}em`,
          color: c.paper,
          clipPath: `inset(-10% ${(1 - word) * 100}% -10% 0)`,
        }}
      >
        TEMBA
      </div>
    </div>
  );
}

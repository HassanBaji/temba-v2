import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { c, font, snappy } from "../theme";
import { BrandLockup } from "./brand";

export function EndCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const url = spring({ frame: frame - 34, fps, config: snappy, durationInFrames: 20 });

  return (
    <AbsoluteFill style={{ background: c.ink, alignItems: "center", justifyContent: "center" }}>
      <div style={{ marginTop: -60, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <BrandLockup markSize={240} wordSize={104} markAt={0} wordAt={14} />
        <div
          style={{
            marginTop: 120,
            fontFamily: font.sans,
            fontWeight: 600,
            fontSize: 64,
            letterSpacing: "-0.01em",
            color: c.paper,
            borderTop: `1px solid ${c.hairline}`,
            paddingTop: 44,
            width: 520,
            textAlign: "center",
            clipPath: `inset(0 ${(1 - url) * 50}% 0 ${(1 - url) * 50}%)`,
          }}
        >
          temba.app
        </div>
      </div>
    </AbsoluteFill>
  );
}

import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

import { c, font } from "../theme";
import { BrandLockup } from "./brand";

export const END = { markAt: 0, wordAt: 14, downloadAt: 30 };

export function EndCard() {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [END.downloadAt, END.downloadAt + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: c.ink, alignItems: "center", justifyContent: "center" }}>
      <div style={{ marginTop: -60, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <BrandLockup markSize={240} wordSize={104} markAt={END.markAt} wordAt={END.wordAt} />
        {/* The old address line, kept invisible so the lockup above stays exactly where it was. */}
        <div style={{ position: "relative" }}>
          <div
            aria-hidden
            style={{
              marginTop: 120,
              fontFamily: font.sans,
              fontWeight: 600,
              fontSize: 64,
              borderTop: "1px solid transparent",
              paddingTop: 44,
              width: 520,
              visibility: "hidden",
            }}
          >
            temba.app
          </div>
          <div
            style={{
              position: "absolute",
              top: 96,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 32,
              opacity: fade,
            }}
          >
            <div dir="rtl" lang="ar" style={{ fontFamily: font.arabic, fontWeight: 700, fontSize: 56, lineHeight: 1.3, color: c.paper, whiteSpace: "nowrap" }}>
              حمّل التطبيق
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              {["App Store", "Google Play"].map((store) => (
                <div
                  key={store}
                  style={{
                    width: 300,
                    height: 96,
                    borderRadius: 18,
                    border: `2px solid ${c.paper}`,
                    boxSizing: "border-box",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: font.sans,
                    fontWeight: 600,
                    fontSize: 38,
                    color: c.paper,
                    whiteSpace: "nowrap",
                  }}
                >
                  {store}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

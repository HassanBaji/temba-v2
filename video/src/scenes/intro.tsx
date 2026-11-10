import { AbsoluteFill } from "remotion";

import { c } from "../theme";
import { BrandLockup } from "./brand";

export const INTRO = { markAt: 4, wordAt: 26 };

export function Intro() {
  return (
    <AbsoluteFill style={{ background: c.ink, alignItems: "center", justifyContent: "center" }}>
      <div style={{ marginTop: -80 }}>
        <BrandLockup markSize={300} wordSize={124} markAt={INTRO.markAt} wordAt={INTRO.wordAt} />
      </div>
    </AbsoluteFill>
  );
}

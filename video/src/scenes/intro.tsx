import { AbsoluteFill } from "remotion";

import { c } from "../theme";
import { BrandLockup } from "./brand";

export function Intro() {
  return (
    <AbsoluteFill style={{ background: c.ink, alignItems: "center", justifyContent: "center" }}>
      <div style={{ marginTop: -80 }}>
        <BrandLockup markSize={300} wordSize={124} markAt={4} wordAt={26} />
      </div>
    </AbsoluteFill>
  );
}

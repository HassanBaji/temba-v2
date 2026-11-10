import { Composition } from "remotion";

import { Demo } from "./Demo";
import { DURATION, FPS, HEIGHT, WIDTH } from "./theme";

export function Root() {
  return (
    <Composition
      id="TembaDemo"
      component={Demo}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
}

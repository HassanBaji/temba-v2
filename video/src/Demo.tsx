import { AbsoluteFill, Audio, getStaticFiles, interpolate, Sequence, staticFile } from "remotion";

import { loadFonts } from "./fonts";
import { EndCard } from "./scenes/end-card";
import { Intro } from "./scenes/intro";
import { Stage } from "./stage";
import { c, DURATION, FPS, scenes } from "./theme";

loadFonts();

function Music() {
  const hasMusic = getStaticFiles().some((file) => file.name === "music.mp3");
  if (!hasMusic) return null;
  return (
    <Audio
      src={staticFile("music.mp3")}
      volume={(frame) =>
        interpolate(frame, [DURATION - FPS, DURATION], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      }
    />
  );
}

export function Demo() {
  return (
    <AbsoluteFill style={{ background: c.wash }}>
      <Sequence durationInFrames={scenes.intro.to} name="Intro">
        <Intro />
      </Sequence>
      <Sequence from={scenes.group.from} durationInFrames={scenes.season.to - scenes.group.from} name="App">
        <Stage />
      </Sequence>
      <Sequence from={scenes.end.from} durationInFrames={scenes.end.to - scenes.end.from} name="End card">
        <EndCard />
      </Sequence>
      <Music />
    </AbsoluteFill>
  );
}

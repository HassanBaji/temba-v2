import { AbsoluteFill, Audio, getStaticFiles, interpolate, Sequence, staticFile } from "remotion";

import { buildCues } from "./cues";
import { loadFonts } from "./fonts";
import { EndCard } from "./scenes/end-card";
import { Intro } from "./scenes/intro";
import { Stage } from "./stage";
import { c, DURATION, FPS, scenes } from "./theme";

loadFonts();

const fadeOut = (frame: number, volume: number) =>
  volume *
  interpolate(frame, [DURATION - FPS, DURATION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** `public/music.mp3`, when present, replaces the generated bed; the effects stay. */
function Music() {
  const files = getStaticFiles().map((file) => file.name);
  const src = files.includes("music.mp3") ? "music.mp3" : files.includes("audio/bed.wav") ? "audio/bed.wav" : null;
  if (!src) return null;
  return <Audio src={staticFile(src)} volume={(frame) => fadeOut(frame, 0.42)} />;
}

const cues = buildCues();

function SoundEffects() {
  const files = new Set(getStaticFiles().map((file) => file.name));
  return (
    <>
      {cues
        .filter((cue) => files.has(`audio/${cue.sound}.wav`))
        .map((cue, index) => (
          <Sequence key={index} from={cue.frame} layout="none" name={`sfx ${cue.sound}`}>
            <Audio src={staticFile(`audio/${cue.sound}.wav`)} volume={cue.volume} />
          </Sequence>
        ))}
    </>
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
      <SoundEffects />
    </AbsoluteFill>
  );
}

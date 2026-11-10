import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { captions } from "./data";
import { PHONE, PhoneFrame } from "./phone";
import { GameScreen } from "./scenes/game";
import { GroupScreen } from "./scenes/group";
import { ProfileScreen, ScoreScreen } from "./scenes/result";
import { SeasonScreen } from "./scenes/season";
import { TeamsScreen } from "./scenes/teams";
import { c, font, scenes, snappy } from "./theme";

const base = scenes.group.from;
const local = (scene: { from: number; to: number }) => ({
  from: scene.from - base,
  to: scene.to - base,
});

const S = {
  group: local(scenes.group),
  game: local(scenes.game),
  teams: local(scenes.teams),
  result: local(scenes.result),
  season: local(scenes.season),
};

/** Where the score hands over to the player's profile inside scene 5. */
const PROFILE_AT = S.result.from + 62;

/** Resting pose per scene and the swing the phone makes on the way there. */
const POSES = [
  { at: S.group.from, ry: -2, rx: 2, swing: -18 },
  { at: S.game.from, ry: 2, rx: 1.5, swing: 9 },
  { at: S.teams.from, ry: -2, rx: 2, swing: -9 },
  { at: S.result.from, ry: 2, rx: 1.5, swing: 9 },
  { at: S.season.from, ry: -2, rx: 2, swing: -9 },
];

function usePose() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let ry = -24;
  let rx = 16;
  let swing = 0;
  POSES.forEach((pose, index) => {
    const p = spring({ frame: frame - pose.at, fps, config: { damping: 200, stiffness: 90, mass: 1 }, durationInFrames: 26 });
    const previous = index === 0 ? { ry: -24, rx: 16 } : POSES[index - 1]!;
    ry += (pose.ry - previous.ry) * p;
    rx += (pose.rx - previous.rx) * p;
    if (index > 0) swing += Math.sin(p * Math.PI) * pose.swing;
  });
  const enter = spring({ frame, fps, config: snappy, durationInFrames: 28 });
  return {
    ry: ry + swing,
    rx,
    y: interpolate(enter, [0, 1], [520, 0]),
    scale: interpolate(enter, [0, 1], [0.9, 1]),
  };
}

const CAPTIONS = [
  { ...S.group, text: captions.group },
  { ...S.game, text: captions.game },
  { ...S.teams, text: captions.teams },
  { ...S.result, text: captions.result },
  { ...S.season, text: captions.season },
];

/** An RTL wipe in from the right, and out the same way before the next scene. */
function Caption({ text, from, to }: { text: string; from: number; to: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - from - 4, fps, config: snappy, durationInFrames: 20 });
  const exit = spring({ frame: frame - (to - 9), fps, config: snappy, durationInFrames: 9 });
  if (frame < from || frame >= to) return null;
  const last = to === S.season.to;
  const out = last ? 0 : exit;
  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 70px",
        textAlign: "center",
        fontFamily: font.arabic,
        fontWeight: 700,
        fontSize: 88,
        lineHeight: 1.32,
        color: c.ink,
        transform: `translateX(${(1 - enter) * 36}px)`,
        clipPath: `inset(-30% ${out * 100}% -30% ${(1 - enter) * 100}%)`,
      }}
    >
      {text}
    </div>
  );
}

/** Screens push in from the right, as in the app's stack navigation. */
function Push({ from, to, first = false, children }: { from: number; to: number; first?: boolean; children: ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = first ? 1 : spring({ frame: frame - from, fps, config: snappy, durationInFrames: 18 });
  const leave = spring({ frame: frame - to, fps, config: snappy, durationInFrames: 18 });
  if (frame < from || frame >= to + 18) return null;
  const x = (1 - enter) * 100 - leave * 28;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `translateX(${x}%)`,
        borderLeft: enter < 1 ? `1px solid ${c.rule}` : undefined,
      }}
    >
      <Sequence from={from} layout="none">
        {children}
      </Sequence>
    </div>
  );
}

export function Stage() {
  const pose = usePose();
  return (
    <AbsoluteFill style={{ background: c.wash }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 40, height: 420 }}>
        {CAPTIONS.map((caption) => (
          <Caption key={caption.text} {...caption} />
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          top: 470,
          left: (1080 - PHONE.width) / 2,
          perspective: 2600,
        }}
      >
        <div
          style={{
            transform: `translateY(${pose.y}px) scale(${pose.scale}) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg)`,
            transformOrigin: "50% 40%",
          }}
        >
          <PhoneFrame>
            <Push first from={S.group.from} to={S.group.to}>
              <GroupScreen />
            </Push>
            <Push from={S.game.from} to={S.game.to}>
              <GameScreen />
            </Push>
            <Push from={S.teams.from} to={S.teams.to}>
              <TeamsScreen />
            </Push>
            <Push from={S.result.from} to={PROFILE_AT}>
              <ScoreScreen />
            </Push>
            <Push from={PROFILE_AT} to={S.result.to}>
              <ProfileScreen />
            </Push>
            <Push from={S.season.from} to={S.season.to + 30}>
              <SeasonScreen />
            </Push>
          </PhoneFrame>
        </div>
      </div>
    </AbsoluteFill>
  );
}

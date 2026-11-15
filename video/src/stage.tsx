import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { captions } from "./data";
import { PHONE, PhoneFrame, StatusBar, TabBar, type Tab } from "./phone";
import { ChallengesScreen, RIVALS_AT } from "./scenes/challenges";
import { GameScreen } from "./scenes/game";
import { MARKS_AT, ResultScreen } from "./scenes/result";
import { SeasonScreen } from "./scenes/season";
import { TeamsScreen } from "./scenes/teams";
import { TiersScreen } from "./scenes/tiers";
import { c, font, scenes, snappy } from "./theme";

/** Screens crossfade over 0.2 s, centred on each boundary. */
export const FADE = 6;
const HALF = FADE / 2;

const base = scenes.game.from;
const local = (scene: { from: number; to: number }) => ({ from: scene.from - base, to: scene.to - base });

export const S = {
  game: local(scenes.game),
  teams: local(scenes.teams),
  result: local(scenes.result),
  season: local(scenes.season),
  tiers: local(scenes.tiers),
  challenges: local(scenes.challenges),
};

/** Frame 0 of a scene's own timeline, in Stage frames: half a crossfade early. */
export const sceneStart = (scene: { from: number }) => scene.from - HALF;

const SCREENS: { scene: { from: number; to: number }; tab: Tab; render: () => ReactNode }[] = [
  { scene: S.game, tab: "games", render: () => <GameScreen /> },
  { scene: S.teams, tab: "games", render: () => <TeamsScreen /> },
  { scene: S.result, tab: "games", render: () => <ResultScreen /> },
  { scene: S.season, tab: "groups", render: () => <SeasonScreen /> },
  { scene: S.tiers, tab: "groups", render: () => <TiersScreen /> },
  { scene: S.challenges, tab: "challenges", render: () => <ChallengesScreen /> },
];

const CAPTIONS = [
  { ...S.game, text: captions.game },
  { ...S.teams, text: captions.teams },
  { from: S.result.from, to: sceneStart(S.result) + MARKS_AT, text: captions.mvp },
  { from: sceneStart(S.result) + MARKS_AT, to: S.result.to, text: captions.marks },
  { ...S.season, text: captions.season },
  { ...S.tiers, text: captions.tiers },
  { from: S.challenges.from, to: sceneStart(S.challenges) + RIVALS_AT, text: captions.challenge },
  { from: sceneStart(S.challenges) + RIVALS_AT, to: S.challenges.to, text: captions.rivals },
];

const CAPTION_SIZE = 88;
const CAPTION_WIDTH = 940;
let measure: CanvasRenderingContext2D | null = null;

/** One line always: a long caption steps its size down to fit the width. */
function captionSize(text: string) {
  measure ??= document.createElement("canvas").getContext("2d");
  if (!measure) return CAPTION_SIZE;
  measure.font = `700 ${CAPTION_SIZE}px ${font.arabic}`;
  measure.direction = "rtl";
  const width = measure.measureText(text).width;
  return width > CAPTION_WIDTH ? Math.floor((CAPTION_SIZE * CAPTION_WIDTH) / width) : CAPTION_SIZE;
}

/** An RTL wipe in from the right, and out the same way before the next caption. */
function Caption({ text, from, to }: { text: string; from: number; to: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - from - 4, fps, config: snappy, durationInFrames: 20 });
  const exit = spring({ frame: frame - (to - 9), fps, config: snappy, durationInFrames: 9 });
  if (frame < from || frame >= to) return null;
  const out = to === S.challenges.to ? 0 : exit;
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
        whiteSpace: "nowrap",
        fontFamily: font.arabic,
        fontWeight: 700,
        fontSize: captionSize(text),
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

function Crossfade({ from, to, first, last, children }: { from: number; to: number; first: boolean; last: boolean; children: ReactNode }) {
  const frame = useCurrentFrame();
  const start = first ? from : from - HALF;
  const end = last ? to : to + HALF;
  if (frame < start || frame >= end) return null;
  const opacity = interpolate(
    frame,
    [from - HALF, from + HALF, to - HALF, to + HALF],
    [first ? 1 : 0, 1, 1, last ? 1 : 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <Sequence from={sceneStart({ from })} layout="none">
        {children}
      </Sequence>
    </div>
  );
}

function activeTab(frame: number): Tab {
  return [...SCREENS].reverse().find((screen) => frame >= screen.scene.from)?.tab ?? "games";
}

export function Stage() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: snappy, durationInFrames: 28 });
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
          transform: `translateY(${interpolate(enter, [0, 1], [520, 0])}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
          transformOrigin: "50% 40%",
        }}
      >
        <PhoneFrame>
          {SCREENS.map((screen, index) => (
            <Crossfade key={index} {...screen.scene} first={index === 0} last={index === SCREENS.length - 1}>
              {screen.render()}
            </Crossfade>
          ))}
          <StatusBar />
          <TabBar active={activeTab(frame)} />
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
}

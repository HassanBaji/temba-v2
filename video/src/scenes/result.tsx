import { Check } from "lucide-react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { game, profile } from "../data";
import { Screen } from "../phone";
import { Avatar } from "../primitives/avatar";
import { FormSlot, ResultMark } from "../primitives/marks";
import { Hairline, Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { c, radii, snap } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const SCORE_FROM = 8;
export const A_EVERY = 5;
export const B_EVERY = 7;
export const SCORE = { a: 5, b: 3 };
export const MARKS_AT = 36;
export const CONFIRM_AT = 46;

function tick(to: number, from: number, until: number, frame: number) {
  return Math.round(interpolate(frame, [from, until], [0, to], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 3) }));
}

export function ScoreScreen() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = Math.min(SCORE.a, Math.max(0, Math.floor((frame - SCORE_FROM) / A_EVERY)));
  const b = Math.min(SCORE.b, Math.max(0, Math.floor((frame - SCORE_FROM) / B_EVERY)));
  const snapA = spring({ frame: frame - (SCORE_FROM + a * A_EVERY), fps, config: snap });
  const snapB = spring({ frame: frame - (SCORE_FROM + b * B_EVERY), fps, config: snap });
  const marks = spring({ frame: frame - MARKS_AT, fps, config: snap });
  const confirmed = frame >= CONFIRM_AT;
  const press = spring({ frame: frame - CONFIRM_AT, fps, config: snap });

  const digit = (value: number, s: number) => (
    <Text size={132} expanded style={{ lineHeight: "132px", width: 112, textAlign: "center", transform: `scale(${0.9 + s * 0.1})` }}>
      {value}
    </Text>
  );

  return (
    <Screen title="Result" tab="games">
      <Text size="meta" muted style={{ marginTop: 2 }}>
        {game.day} · {game.venue}
      </Text>
      <Surface style={{ marginTop: 22, padding: "24px 14px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 10px" }}>
          {["Team A", "Team B"].map((name, index) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: index === 0 ? c.ink : c.paper, border: `1px solid ${c.ink}` }} />
              <Text size="lead" weight="semibold">
                {name}
              </Text>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 18 }}>
          {digit(a, snapA)}
          <Text size={80} expanded color={c.faint} style={{ width: 62, textAlign: "center", lineHeight: "132px" }}>
            –
          </Text>
          {digit(b, snapB)}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "0 18px", marginTop: 16 }}>
          {(["won", "lost"] as const).map((variant) => (
            <div key={variant} style={{ display: "flex", alignItems: "center", gap: 7, transform: `scale(${marks})` }}>
              <ResultMark variant={variant} size={22} />
              <Text size="lead" weight="semibold">
                {variant === "won" ? "Won" : "Lost"}
              </Text>
            </div>
          ))}
        </div>
      </Surface>

      <div
        style={{
          marginTop: 22,
          height: 54,
          borderRadius: radii.lg,
          background: confirmed ? c.paper : c.ink,
          border: `1.5px solid ${c.ink}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transform: `scale(${confirmed ? 0.96 + press * 0.04 : 1})`,
        }}
      >
        {confirmed ? <Check size={19} strokeWidth={2.6} /> : null}
        <Text size="lead" weight="semibold" color={confirmed ? c.ink : c.paper}>
          {confirmed ? "Score confirmed" : "Confirm score"}
        </Text>
      </div>
      <Text size="meta" muted align="center" style={{ marginTop: 12 }}>
        {confirmed ? "Stats updated for all 10 players" : "Both captains confirm the final score"}
      </Text>
    </Screen>
  );
}

export const FORM_FROM = 12;
export const FORM_EVERY = 4;
const STATS_FROM = 16;
export const CHART_FROM = 26;
export const CHART_FRAMES = 44;

function Chart({ frame }: { frame: number }) {
  const W = 288;
  const H = 108;
  const min = 30;
  const max = 70;
  const points = profile.trend.map((value, index) => ({
    x: (index / (profile.trend.length - 1)) * W,
    y: H - ((value - min) / (max - min)) * H,
  }));
  const d = points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const progress = interpolate(frame, [CHART_FROM, CHART_FROM + CHART_FRAMES], [0, 1], { ...clamp, easing: (t) => 1 - Math.pow(1 - t, 2) });
  const last = points[points.length - 1]!;
  const dot = spring({ frame: frame - (CHART_FROM + CHART_FRAMES - 4), fps: 30, config: snap });
  return (
    <svg width={W} height={H + 4} style={{ display: "block", overflow: "visible" }}>
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={0} x2={W} y1={H * t} y2={H * t} stroke={c.rule} strokeWidth={1} />
      ))}
      <line x1={0} x2={W} y1={H} y2={H} stroke={c.ink} strokeWidth={1} />
      <path d={d} fill="none" stroke={c.ink} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - progress} />
      <circle cx={last.x} cy={last.y} r={5 * dot} fill={c.ink} />
    </svg>
  );
}

function Stat({ label, value, suffix = "", frame }: { label: string; value: number; suffix?: string; frame: number }) {
  return (
    <div style={{ flex: 1, padding: "14px 14px 12px" }}>
      <Text size="statTotal" expanded>
        {tick(value, STATS_FROM, STATS_FROM + 34, frame)}
        {suffix}
      </Text>
      <Text size="meta" muted style={{ marginTop: 6 }}>
        {label}
      </Text>
    </div>
  );
}

export function ProfileScreen() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Screen title="" back tab="profile">
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: -4 }}>
        <Avatar name={profile.name} size={64} />
        <div>
          <Text size="h2" weight="bold">
            {profile.name}
          </Text>
          <Text size="meta" muted style={{ marginTop: 2 }}>
            {profile.group}
          </Text>
        </div>
      </div>

      <Text size="title" weight="semibold" style={{ marginTop: 24, marginBottom: 10 }}>
        Recent form
      </Text>
      <div style={{ display: "flex", gap: 5 }}>
        {profile.form.map((variant, index) => {
          const at = FORM_FROM + index * FORM_EVERY;
          const s = spring({ frame: frame - at, fps, config: snap });
          const filled = frame >= at;
          return (
            <FormSlot
              key={index}
              variant={filled ? variant : "not-played"}
              style={{ transform: `scale(${filled ? 0.8 + 0.2 * s : 1})` }}
            />
          );
        })}
      </div>

      <Surface style={{ marginTop: 18 }}>
        <div style={{ display: "flex" }}>
          <Stat label="Played" value={profile.played} frame={frame} />
          <div style={{ width: 1, background: c.rule }} />
          <Stat label="Won" value={profile.won} frame={frame} />
          <div style={{ width: 1, background: c.rule }} />
          <Stat label="Win rate" value={profile.winRate} suffix="%" frame={frame} />
        </div>
        <Hairline />
        <div style={{ padding: "14px 16px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <Text size="meta" weight="semibold">
              Win rate · this season
            </Text>
            <Text size="meta" muted>
              13 games
            </Text>
          </div>
          <Chart frame={frame} />
        </div>
      </Surface>
    </Screen>
  );
}

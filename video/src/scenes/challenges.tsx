import { CalendarDays, Clock, MapPin, Swords, Users } from "lucide-react";
import type { ReactNode } from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { challenge, rivals } from "../data";
import { Screen } from "../phone";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hatch } from "../primitives/hatch";
import { FormSlot } from "../primitives/marks";
import { Hairline, Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { c, radii, snap, snappy } from "../theme";

export const PROPOSAL_AT = 18;
export const ACCEPT_AT = 40;
export const GAME_AT = 50;
export const SQUAD_FROM = 60;
export const SQUAD_EVERY = 5;
export const RIVALS_AT = 87;
export const TAB_SLIDE_AT = 92;
export const H2H_FROM = 100;
export const FORM_FROM = 114;
export const FORM_EVERY = 4;
export const REMATCH_AT = 134;
export const SECOND_AT = 146;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SEGMENTS = ["Open", "Mine", "Rivals"] as const;
const SEGMENT_WIDTH = 72;

function TeamTile({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radii.md,
        background: c.wash,
        border: `1px solid ${c.rule}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text size={size * 0.34} weight="bold">
        {initials}
      </Text>
    </div>
  );
}

function Line({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, height: 22, color: c.muted }}>
      {icon}
      <Text size="meta" color={c.ink}>
        {children}
      </Text>
    </div>
  );
}

function Segments({ at }: { at: number }) {
  return (
    <div style={{ position: "relative", display: "flex", borderBottom: `1px solid ${c.rule}`, marginTop: 2 }}>
      {SEGMENTS.map((segment, i) => (
        <div key={segment} style={{ width: SEGMENT_WIDTH, paddingBottom: 10 }}>
          <Text weight={Math.round(at) === i ? "semibold" : "medium"} muted={Math.round(at) !== i}>
            {segment}
          </Text>
        </div>
      ))}
      <div style={{ position: "absolute", bottom: -1, left: at * SEGMENT_WIDTH, width: 44, height: 2, background: c.ink }} />
    </div>
  );
}

function OpenBoard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({ frame: frame - PROPOSAL_AT, fps, config: snappy, durationInFrames: 18 });
  const press = frame >= ACCEPT_AT ? spring({ frame: frame - ACCEPT_AT, fps, config: snap }) : 1;
  const pressed = frame >= ACCEPT_AT && frame < ACCEPT_AT + 6;
  return (
    <Screen title="Challenges" back={false}>
      <Segments at={0} />
      <Surface style={{ marginTop: 14, padding: "16px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <TeamTile name={challenge.team} />
          <div>
            <Text size="title" weight="semibold">
              {challenge.team}
            </Text>
            <Text size="meta" muted>
              Football
            </Text>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <Line icon={<Users size={15} strokeWidth={2} />}>{challenge.lines[0]}</Line>
          <Line icon={<MapPin size={15} strokeWidth={2} />}>{challenge.lines[1]}</Line>
          <Line icon={<Clock size={15} strokeWidth={2} />}>{challenge.lines[2]}</Line>
        </div>
        <Text muted style={{ marginTop: 10, whiteSpace: "normal" }}>
          {challenge.note}
        </Text>
      </Surface>

      <div style={{ transform: `translateX(${(1 - slide) * 110}%)` }}>
        <Text size="title" weight="semibold" style={{ marginTop: 18, marginBottom: 8 }}>
          Proposal
        </Text>
        <Surface style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <TeamTile name={challenge.proposer} size={36} />
            <Text size="lead" weight="semibold">
              {challenge.proposer}
            </Text>
          </div>
          <div style={{ marginTop: 10 }}>
            <Line icon={<CalendarDays size={15} strokeWidth={2} />}>{challenge.proposal[0]}</Line>
            <Line icon={<MapPin size={15} strokeWidth={2} />}>{challenge.proposal[1]}</Line>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Button height={44} style={{ flex: 1 }}>
              Decline
            </Button>
            <Button
              height={44}
              variant="primary"
              style={{ flex: 1, transform: `scale(${pressed ? 0.94 : 0.94 + 0.06 * press})`, outline: pressed ? `3px solid ${c.rule}` : undefined }}
            >
              Accept
            </Button>
          </div>
        </Surface>
      </div>
    </Screen>
  );
}

function SquadColumn({ team, names, from }: { team: string; names: string[]; from: number | null }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Text size="meta" weight="semibold" style={{ marginBottom: 8 }}>
        {team}
      </Text>
      {names.map((name, i) => {
        const at = from == null ? null : from + i * SQUAD_EVERY;
        const named = at != null && frame >= at;
        const pop = at == null ? 0 : spring({ frame: frame - at, fps, config: snap });
        return (
          <div key={i} style={{ height: 40, display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative", width: 30, height: 30, transform: `scale(${named ? 0.8 + 0.2 * pop : 1})` }}>
              {named ? <Avatar name={name} size={30} solid /> : <Hatch radius={15} />}
            </div>
            <Text size="meta" muted={!named}>
              {named ? name : "Not named"}
            </Text>
          </div>
        );
      })}
    </div>
  );
}

function ChallengeGame() {
  return (
    <Screen title="Game">
      <Surface style={{ padding: "16px 16px 14px", marginTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Swords size={15} strokeWidth={2.2} />
          <Text size="meta" weight="semibold">
            Challenge
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 110 }}>
            <TeamTile name={challenge.team} size={44} />
            <Text weight="semibold">{challenge.team}</Text>
          </div>
          <Text size="title" muted>
            vs
          </Text>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 110 }}>
            <TeamTile name={challenge.proposer} size={44} />
            <Text weight="semibold">{challenge.proposer}</Text>
          </div>
        </div>
        <div style={{ margin: "14px 0 10px" }}>
          <Hairline />
        </div>
        <Line icon={<CalendarDays size={15} strokeWidth={2} />}>{challenge.proposal[0]}</Line>
        <Line icon={<MapPin size={15} strokeWidth={2} />}>{challenge.proposal[1]}</Line>
      </Surface>
      <Text size="title" weight="semibold" style={{ marginTop: 18, marginBottom: 10 }}>
        Matchday squads
      </Text>
      <Surface style={{ padding: "14px 16px 6px" }}>
        <div style={{ display: "flex", gap: 12 }}>
          <SquadColumn team={challenge.team} names={challenge.squad} from={SQUAD_FROM} />
          <SquadColumn team={challenge.proposer} names={challenge.squad.map(() => "")} from={null} />
        </div>
      </Surface>
    </Screen>
  );
}

function RivalRow({ index, at }: { index: number; at: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rival = rivals[index]!;
  const enter = spring({ frame: frame - at, fps, config: snappy, durationInFrames: 12 });
  const count = interpolate(frame, [at + 6, at + 22], [0, 1], { ...clamp, easing: (t) => 1 - (1 - t) ** 2 });
  const formFrom = index === 0 ? FORM_FROM : at + 10;
  return (
    <div style={{ clipPath: `inset(0 ${(1 - enter) * 100}% 0 0)`, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <TeamTile name={rival.team} />
        <div style={{ flex: 1 }}>
          <Text size="lead" weight="semibold">
            {rival.team}
          </Text>
          <Text size="meta" muted>
            {rival.games} games
          </Text>
        </div>
        <Text size="statTotal" expanded>
          {Math.round(rival.won * count)}
          <span style={{ color: c.faint, margin: "0 6px" }}>–</span>
          {Math.round(rival.lost * count)}
        </Text>
      </div>
      <Text size="eyebrow" muted style={{ marginTop: 12, marginBottom: 6 }}>
        {index === 0 ? "Last 5" : "Last 2"}
      </Text>
      <div style={{ display: "flex", gap: 5 }}>
        {rival.form.map((variant, i) => {
          const filled = frame >= formFrom + i * FORM_EVERY;
          const pop = spring({ frame: frame - (formFrom + i * FORM_EVERY), fps, config: snap });
          return (
            <FormSlot
              key={i}
              variant={filled ? variant : "not-played"}
              height={32}
              style={{ flex: "0 0 48px", transform: `scale(${filled ? 0.8 + 0.2 * pop : 1})` }}
            />
          );
        })}
      </div>
    </div>
  );
}

function RivalsBoard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slide = spring({ frame: frame - TAB_SLIDE_AT, fps, config: snappy, durationInFrames: 14 });
  const rematch = spring({ frame: frame - REMATCH_AT, fps, config: snap });
  const showRematch = frame >= REMATCH_AT;
  return (
    <Screen title="Challenges" back={false}>
      <Segments at={slide * 2} />
      <Text size="meta" muted style={{ marginTop: 12 }}>
        {challenge.team}, head-to-head
      </Text>
      <Surface style={{ marginTop: 8 }}>
        <RivalRow index={0} at={H2H_FROM} />
        <div style={{ padding: "0 16px 14px", opacity: showRematch ? Math.min(1, rematch * 1.5) : 0, transform: `scale(${showRematch ? 0.92 + 0.08 * rematch : 1})` }}>
          <Button variant="primary" height={44}>
            Rematch
          </Button>
        </div>
        {frame >= SECOND_AT ? (
          <>
            <Hairline />
            <RivalRow index={1} at={SECOND_AT} />
          </>
        ) : null}
      </Surface>
    </Screen>
  );
}

export function ChallengesScreen() {
  const frame = useCurrentFrame();
  const toGame = interpolate(frame, [GAME_AT - 3, GAME_AT + 3], [0, 1], clamp);
  const toRivals = interpolate(frame, [RIVALS_AT - 3, RIVALS_AT + 3], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {toGame < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: 1 - toGame }}>
          <OpenBoard />
        </div>
      ) : null}
      {toGame > 0 && toRivals < 1 ? (
        <div style={{ position: "absolute", inset: 0, opacity: toGame * (1 - toRivals) }}>
          <ChallengeGame />
        </div>
      ) : null}
      {toRivals > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: toRivals }}>
          <RivalsBoard />
        </div>
      ) : null}
    </div>
  );
}

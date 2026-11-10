import { Lock, Shuffle } from "lucide-react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { finalSplit, firstSplit, players } from "../data";
import { Screen } from "../phone";
import { Avatar } from "../primitives/avatar";
import { Text } from "../primitives/text";
import { c, radii, snap, snappy } from "../theme";

const SPLIT_AT = 26;
const SHUFFLE_AT = 58;
const LOCK_AT = 86;

const WIDTH = 320;
const COLUMN = 150;
const GAP = WIDTH - COLUMN * 2;
const LIST_ROW = 45;
const HEADER = 62;
const COLUMN_ROW = 54;
const CHIP = 44;

type Split = { a: number[]; b: number[] };

function slotIn(split: Split, index: number) {
  const a = split.a.indexOf(index);
  return a >= 0 ? { team: 0, row: a } : { team: 1, row: split.b.indexOf(index) };
}

function columnPosition(split: Split, index: number) {
  const { team, row } = slotIn(split, index);
  return { x: team * (COLUMN + GAP), y: HEADER + row * COLUMN_ROW };
}

function average(indices: number[]) {
  return indices.reduce((sum, i) => sum + players[i]!.level, 0) / indices.length;
}

function Chip({ index, split, shuffle }: { index: number; split: number; shuffle: number }) {
  const player = players[index]!;
  const list = { x: 0, y: index * LIST_ROW };
  const first = columnPosition(firstSplit, index);
  const final = columnPosition(finalSplit, index);
  const moves = slotIn(firstSplit, index).team !== slotIn(finalSplit, index).team;
  const x = interpolate(split, [0, 1], [list.x, first.x]) + (final.x - first.x) * shuffle;
  const y = interpolate(split, [0, 1], [list.y, first.y]) + (final.y - first.y) * shuffle;
  const width = interpolate(split, [0, 1], [WIDTH, COLUMN]);
  const lift = moves ? Math.sin(shuffle * Math.PI) : 0;
  // Swapped players arc past each other instead of crossing on one line.
  const arc = lift * (slotIn(firstSplit, index).team === 0 ? -26 : 26);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y + arc,
        width,
        height: CHIP,
        borderRadius: radii.lg,
        border: `1px solid ${lift > 0.05 ? c.ink : c.rule}`,
        background: c.paper,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "0 9px 0 6px",
        boxSizing: "border-box",
        transform: `scale(${1 + lift * 0.06})`,
        zIndex: moves ? 2 : 1,
      }}
    >
      <Avatar name={player.name} size={26} />
      <Text size={14} weight="medium" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
        {player.short}
      </Text>
      <Text size="meta" muted>
        {player.level.toFixed(1)}
      </Text>
    </div>
  );
}

function Bib({ fill }: { fill: string }) {
  return <div style={{ width: 14, height: 14, borderRadius: 4, background: fill, border: `1px solid ${c.ink}` }} />;
}

export function TeamsScreen() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = spring({ frame: frame - SPLIT_AT, fps, config: snappy, durationInFrames: 22 });
  const shuffle = spring({ frame: frame - SHUFFLE_AT, fps, config: snappy, durationInFrames: 22 });
  const lock = spring({ frame: frame - LOCK_AT, fps, config: snap });
  const locked = frame >= LOCK_AT;
  const levels = shuffle > 0.5 ? [average(finalSplit.a), average(finalSplit.b)] : [average(firstSplit.a), average(firstSplit.b)];

  return (
    <Screen
      title="Teams"
      tab="games"
      trailing={
        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingRight: 6 }}>
          {locked ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, transform: `scale(${lock})` }}>
              <Lock size={16} strokeWidth={2.4} />
              <Text size="meta" weight="semibold">
                Locked
              </Text>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: c.muted }}>
              <Shuffle size={16} strokeWidth={2.2} />
              <Text size="meta" muted>
                Shuffle
              </Text>
            </div>
          )}
        </div>
      }
    >
      <Text size="meta" muted style={{ marginTop: 2 }}>
        10 players · balanced by Level
      </Text>
      <div style={{ position: "relative", height: 470, marginTop: 18 }}>
        {[0, 1].map((team) => (
          <div
            key={team}
            style={{
              position: "absolute",
              left: team * (COLUMN + GAP) - 7,
              top: -7,
              width: COLUMN + 14,
              height: HEADER + COLUMN_ROW * 5 + 6,
              borderRadius: radii.surface,
              border: `${locked ? 1.5 : 1}px solid ${locked ? c.ink : c.rule}`,
              background: c.wash,
              opacity: split,
              boxSizing: "border-box",
              padding: "12px 13px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bib fill={team === 0 ? c.ink : c.paper} />
              <Text size="lead" weight="semibold">
                {team === 0 ? "Team A" : "Team B"}
              </Text>
            </div>
            <Text size="meta" muted style={{ marginTop: 3 }}>
              Level {levels[team]!.toFixed(1)}
            </Text>
          </div>
        ))}
        {players.map((_, index) => (
          <Chip key={index} index={index} split={split} shuffle={shuffle} />
        ))}
      </div>
    </Screen>
  );
}

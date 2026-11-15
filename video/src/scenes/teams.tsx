import { Lock, Shuffle } from "lucide-react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { FAISAL, finalSplit, firstSplit, players, QASSIM } from "../data";
import { Screen } from "../phone";
import { TierFish } from "../primitives/fish";
import { Text } from "../primitives/text";
import { c, radii, snap, snappy } from "../theme";
import { averagePoints, before, formatPoints, placeOf } from "../tiers";

export const SPLIT_AT = 24;
export const SWAP_AT = 54;
export const LOCK_AT = 84;

const WIDTH = 320;
const COLUMN = 150;
const GAP = WIDTH - COLUMN * 2;
const LIST_ROW = 44;
const HEADER = 62;
const COLUMN_ROW = 52;
const CHIP = 42;

type Split = { a: number[]; b: number[] };

const poolOrder = players.map((_, index) => index).sort((x, y) => players[y]!.points - players[x]!.points);

function slotIn(split: Split, index: number) {
  const a = split.a.indexOf(index);
  return a >= 0 ? { team: 0, row: a } : { team: 1, row: split.b.indexOf(index) };
}

function columnPosition(split: Split, index: number) {
  const { team, row } = slotIn(split, index);
  return { x: team * (COLUMN + GAP), y: HEADER + row * COLUMN_ROW };
}

function Chip({ index, split, swap }: { index: number; split: number; swap: number }) {
  const player = players[index]!;
  const list = { x: 0, y: poolOrder.indexOf(index) * LIST_ROW };
  const first = columnPosition(firstSplit, index);
  const final = columnPosition(finalSplit, index);
  const swaps = index === FAISAL || index === QASSIM;
  const lift = swaps ? Math.sin(swap * Math.PI) : 0;
  const swapping = swaps && swap > 0.01 && swap < 0.99;
  const arc = lift * (slotIn(firstSplit, index).team === 0 ? -24 : 24);
  const x = interpolate(split, [0, 1], [list.x, first.x]) + (final.x - first.x) * swap;
  const y = interpolate(split, [0, 1], [list.y, first.y]) + (final.y - first.y) * swap + arc;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: interpolate(split, [0, 1], [WIDTH, COLUMN]),
        height: CHIP,
        borderRadius: radii.lg,
        border: swapping ? `1.5px solid ${c.ink}` : `1px solid ${c.rule}`,
        background: c.paper,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "0 10px 0 8px",
        boxSizing: "border-box",
        transform: `scale(${1 + lift * 0.05})`,
        zIndex: swaps ? 2 : 1,
      }}
    >
      <TierFish band={placeOf(before, index).band} width={30} height={18} />
      <Text size={14} weight="medium" style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
        {player.short}
      </Text>
      <Text size="meta" muted>
        {formatPoints(player.points)}
      </Text>
    </div>
  );
}

export function TeamsScreen() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const split = spring({ frame: frame - SPLIT_AT, fps, config: snappy, durationInFrames: 22 });
  const swap = spring({ frame: frame - SWAP_AT, fps, config: snappy, durationInFrames: 22 });
  const lock = spring({ frame: frame - LOCK_AT, fps, config: snap });
  const locked = frame >= LOCK_AT;
  const from = [averagePoints(firstSplit.a), averagePoints(firstSplit.b)];
  const to = [averagePoints(finalSplit.a), averagePoints(finalSplit.b)];
  const averages = from.map((value, team) => value + (to[team]! - value) * swap);

  return (
    <Screen
      title="Make teams"
      trailing={
        <div style={{ display: "flex", alignItems: "center", gap: 5, paddingRight: 6, color: locked ? c.ink : c.muted }}>
          {locked ? (
            <div style={{ display: "flex", alignItems: "center", gap: 5, transform: `scale(${lock})` }}>
              <Lock size={16} strokeWidth={2.4} />
              <Text size="meta" weight="semibold">
                Locked
              </Text>
            </div>
          ) : (
            <>
              <Shuffle size={16} strokeWidth={2.2} />
              <Text size="meta" muted>
                Shuffle
              </Text>
            </>
          )}
        </div>
      }
    >
      <Text size="meta" muted style={{ marginTop: 2 }}>
        Balanced on group tier points
      </Text>
      <div style={{ position: "relative", height: 452, marginTop: 18 }}>
        {[0, 1].map((team) => (
          <div
            key={team}
            style={{
              position: "absolute",
              left: team * (COLUMN + GAP) - 7,
              top: -7,
              width: COLUMN + 14,
              height: HEADER + COLUMN_ROW * 5 + 4,
              borderRadius: radii.surface,
              border: `${locked ? 1.5 : 1}px solid ${locked ? c.ink : c.rule}`,
              background: c.paper,
              opacity: split,
              boxSizing: "border-box",
              padding: "12px 13px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: 4, background: team === 0 ? c.ink : c.paper, border: `1.5px solid ${c.ink}`, boxSizing: "border-box" }} />
              <Text size="lead" weight="semibold">
                {team === 0 ? "Team A" : "Team B"}
              </Text>
            </div>
            <Text size="meta" muted style={{ marginTop: 3 }}>
              avg {formatPoints(averages[team]!)} points
            </Text>
          </div>
        ))}
        {players.map((_, index) => (
          <Chip key={index} index={index} split={split} swap={swap} />
        ))}
      </div>
      <div style={{ marginTop: -116, clipPath: `inset(0 ${(1 - lock) * 100}% 0 0)` }}>
        {locked ? (
          <Text size="meta" weight="semibold">
            Difference of 1 point. Teams locked.
          </Text>
        ) : null}
      </div>
    </Screen>
  );
}

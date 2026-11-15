import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { group, players, standing } from "../data";
import { Screen } from "../phone";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline, Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { c, snap, snappy } from "../theme";
import { GroupTabs } from "./group-tabs";

export const ROWS_FROM = 10;
export const ROW_EVERY = 4;
export const UPDATE_AT = 48;
export const REORDER_AT = 62;
export const SHARE_AT = 90;

const ROW = 44;
const POSITION = 22;
const COUNT = 26;
const POINTS = 34;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const YOUSIF = 2;

const pts = (w: number, d: number) => w * 3 + d;
const beforeSlots = standing.map((_, slot) => slot);
const afterOrder = standing
  .map((row, slot) => ({ slot, pts: pts(row.w + (row.won ? 1 : 0), row.d), w: row.w + (row.won ? 1 : 0) }))
  .sort((a, b) => b.pts - a.pts || b.w - a.w)
  .map((row) => row.slot);

function Row({ slot }: { slot: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const row = standing[slot]!;
  const player = players[row.index]!;
  const enter = spring({ frame: frame - (ROWS_FROM + slot * ROW_EVERY), fps, config: snappy, durationInFrames: 12 });
  const update = interpolate(frame, [UPDATE_AT, UPDATE_AT + 12], [0, 1], clamp);
  const reorder = spring({ frame: frame - REORDER_AT, fps, config: snappy, durationInFrames: 20 });
  const from = beforeSlots.indexOf(slot);
  const to = afterOrder.indexOf(slot);
  const y = (from + (to - from) * reorder) * ROW;
  const position = (reorder > 0.5 ? to : from) + 1;
  const updated = frame >= UPDATE_AT;
  const p = row.p + (updated ? 1 : 0);
  const w = row.w + (updated && row.won ? 1 : 0);
  const points = Math.round(pts(row.w, row.d) + (row.won ? 3 * update : 0));
  const isYousif = row.index === YOUSIF;
  const outline = isYousif ? interpolate(frame, [UPDATE_AT, UPDATE_AT + 6], [0, 1], clamp) : 0;
  const gain = spring({ frame: frame - UPDATE_AT, fps, config: snap });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        height: ROW,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        boxSizing: "border-box",
        background: c.paper,
        borderTop: from === 0 && to === 0 ? "none" : `1px solid ${c.rule}`,
        boxShadow: outline > 0 ? `inset 0 0 0 1px rgba(0,0,0,${outline})` : undefined,
        zIndex: isYousif ? 2 : 1,
        clipPath: `inset(0 ${(1 - enter) * 100}% 0 0)`,
      }}
    >
      <Text size="lead" expanded style={{ width: POSITION }}>
        {position}
      </Text>
      <Avatar name={player.name} size={24} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
        <Text weight={isYousif ? "semibold" : "regular"} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {player.name}
        </Text>
        {isYousif && updated ? (
          <Text size="meta" weight="semibold" style={{ transform: `scale(${gain})` }}>
            +3
          </Text>
        ) : null}
      </div>
      <Text muted align="center" style={{ width: COUNT }}>
        {p}
      </Text>
      <Text muted align="center" style={{ width: COUNT }}>
        {w}
      </Text>
      <Text size="lead" expanded align="right" style={{ width: POINTS }}>
        {points}
      </Text>
    </div>
  );
}

export function SeasonScreen() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const share = spring({ frame: frame - SHARE_AT, fps, config: snap });
  return (
    <Screen title={group.name}>
      <GroupTabs active="Standing" />
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 14, marginBottom: 10 }}>
        <div>
          <Text size="title" weight="semibold">
            Season 3
          </Text>
          <Text size="meta" muted>
            Sep to Dec
          </Text>
        </div>
        <Text size="meta" muted>
          After 54 days
        </Text>
      </div>
      <Surface>
        <div style={{ height: 34, display: "flex", alignItems: "center", gap: 8, padding: "0 12px" }}>
          <Text size="eyebrow" muted style={{ width: POSITION }}>
            #
          </Text>
          <Text size="eyebrow" muted style={{ flex: 1, paddingLeft: 32 }}>
            Player
          </Text>
          <Text size="eyebrow" muted align="center" style={{ width: COUNT }}>
            P
          </Text>
          <Text size="eyebrow" muted align="center" style={{ width: COUNT }}>
            W
          </Text>
          <Text size="eyebrow" weight="semibold" align="right" style={{ width: POINTS }}>
            Pts
          </Text>
        </div>
        <Hairline />
        <div style={{ position: "relative", height: standing.length * ROW }}>
          {standing.map((_, slot) => (
            <Row key={slot} slot={slot} />
          ))}
        </div>
      </Surface>
      <Text size="meta" muted style={{ marginTop: 10 }}>
        Win 3, draw 1, loss 0. Confirmed scores only.
      </Text>
      <div style={{ marginTop: 10, opacity: frame >= SHARE_AT ? Math.min(1, share * 1.5) : 0, transform: `scale(${frame >= SHARE_AT ? 0.92 + share * 0.08 : 1})` }}>
        <Button height={44}>Share standings</Button>
      </div>
    </Screen>
  );
}

import { Trophy } from "lucide-react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { group, standing } from "../data";
import { Screen } from "../phone";
import { Avatar } from "../primitives/avatar";
import { Hairline, Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { c, snappy } from "../theme";

export const ROWS_FROM = 12;
export const ROW_EVERY = 5;
const COUNT_FRAMES = 30;
export const FLIP_AT = 74;
const ROW = 50;

const POSITION = 22;
const COUNT = 24;
const POINTS = 32;

function Row({ index }: { index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const row = standing[index]!;
  const at = ROWS_FROM + index * ROW_EVERY;
  const drop = spring({ frame: frame - at, fps, config: snappy, durationInFrames: 14 });
  const points = Math.round(
    interpolate(frame, [at + 4, at + 4 + COUNT_FRAMES], [0, row.pts], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - Math.pow(1 - t, 3),
    }),
  );
  const flip = index === 0 ? spring({ frame: frame - FLIP_AT, fps, config: { damping: 22, stiffness: 160, mass: 0.8 } }) * 180 : 0;
  const back = flip > 90;
  const ink = back ? c.paper : c.ink;
  const muted = back ? c.dim : c.muted;
  const angle = (back ? flip - 180 : flip) + (1 - drop) * -90;

  return (
    <div style={{ perspective: 700 }}>
      {index > 0 ? <Hairline /> : null}
      <div
        style={{
          height: ROW,
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "0 12px",
          background: back ? c.ink : c.paper,
          transform: `rotateX(${angle}deg)`,
          transformOrigin: index === 0 && flip > 0 ? "50% 50%" : "50% 0%",
          opacity: drop > 0.02 ? 1 : 0,
        }}
      >
        <Text size="lead" expanded color={ink} style={{ width: POSITION }}>
          {index + 1}
        </Text>
        <Avatar name={row.name} size={26} solid={back} style={back ? { background: c.raised, borderColor: c.hairline } : undefined} />
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <Text weight={index === 0 ? "semibold" : "regular"} color={ink} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.name}
          </Text>
          {back ? <Trophy size={14} color={c.paper} strokeWidth={2.4} /> : null}
        </div>
        <Text color={muted} align="center" style={{ width: COUNT }}>
          {row.p}
        </Text>
        <Text color={muted} align="center" style={{ width: COUNT }}>
          {row.w}
        </Text>
        <Text size="lead" expanded color={ink} align="right" style={{ width: POINTS }}>
          {points}
        </Text>
      </div>
    </div>
  );
}

export function SeasonScreen() {
  return (
    <Screen title={group.name} tab="groups">
      <div style={{ display: "flex", gap: 22, borderBottom: `1px solid ${c.rule}`, marginTop: 2 }}>
        {["Standing", "Games", "Members"].map((tab, index) => (
          <div key={tab} style={{ paddingBottom: 10, borderBottom: index === 0 ? `2px solid ${c.ink}` : "2px solid transparent", marginBottom: -1 }}>
            <Text weight={index === 0 ? "semibold" : "medium"} muted={index !== 0}>
              {tab}
            </Text>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 18, marginBottom: 12 }}>
        <Text size="title" weight="semibold">
          Season 3
        </Text>
        <Text size="meta" muted>
          Sep – Dec · 12 games
        </Text>
      </div>
      <Surface>
        <div style={{ height: 36, display: "flex", alignItems: "center", gap: 7, padding: "0 12px" }}>
          <Text size="eyebrow" muted style={{ width: POSITION }}>
            #
          </Text>
          <Text size="eyebrow" muted style={{ flex: 1, paddingLeft: 33 }}>
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
        {standing.map((_, index) => (
          <Row key={index} index={index} />
        ))}
      </Surface>
      <Text size="meta" muted style={{ marginTop: 12 }}>
        Win 3 · draw 1 · confirmed scores only
      </Text>
    </Screen>
  );
}

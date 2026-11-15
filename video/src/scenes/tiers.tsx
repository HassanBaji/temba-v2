import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { group, memberCount, players, provisional, sharkWeeks } from "../data";
import { Screen } from "../phone";
import { ProvisionalSlot, TierFish } from "../primitives/fish";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { c, radii, snap, snappy } from "../theme";
import { after, bandLabel, before, formatPoints, placeOf, type Band } from "../tiers";
import { GroupTabs } from "./group-tabs";

export const SHARK_AT = 8;
export const ROWS_FROM = 14;
export const ROW_EVERY = 4;
export const MOVE_AT = 54;
export const REORDER_AT = 68;
export const PROMOTE_AT = 79;

const ROW = 50;
const TIER_WIDTH = 44;
const POINTS_WIDTH = 56;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** The player whose fish changes up, and the one it pushes down. */
const promoted = after.find((row) => bandRank(row.band) < bandRank(placeOf(before, row.index).band))!.index;

function bandRank(band: Band) {
  return ["shark", "hamour", "kanaad", "safi"].indexOf(band);
}

function caption(index: number, band: Band) {
  return index === 0 ? `${bandLabel[band]}, organizer` : bandLabel[band];
}

function SharkCard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const swim = spring({ frame: frame - SHARK_AT, fps, config: snappy, durationInFrames: 24 });
  const wobble = Math.sin(swim * Math.PI * 2) * (1 - swim) * 8;
  const shark = players[0]!;
  const moved = interpolate(frame, [MOVE_AT, MOVE_AT + 20], [0, shark.move], clamp);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        borderRadius: radii.card,
        border: `1px solid ${c.rule}`,
        background: c.wash,
        marginTop: 14,
      }}
    >
      <div style={{ transform: `translateX(${(1 - swim) * -46}px) rotate(${wobble}deg)` }}>
        <TierFish band="shark" width={74} height={44} cutout={c.wash} />
      </div>
      <div style={{ minWidth: 0 }}>
        <Text size="eyebrow" muted>
          The Shark
        </Text>
        <Text size="title" weight="bold" expanded style={{ marginTop: 2 }}>
          {shark.name}
        </Text>
        <Text size="meta" muted style={{ marginTop: 2 }}>
          {formatPoints(shark.points + moved)} points, a Shark for {sharkWeeks} weeks
        </Text>
      </div>
    </div>
  );
}

function RankedRow({ index }: { index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const player = players[index]!;
  const from = placeOf(before, index);
  const to = placeOf(after, index);
  const enterAt = ROWS_FROM + (from.place - 1) * ROW_EVERY;
  const enter = spring({ frame: frame - enterAt, fps, config: snappy, durationInFrames: 12 });
  const fishPop = spring({ frame: frame - enterAt - 3, fps, config: snap });
  const reorder = spring({ frame: frame - REORDER_AT, fps, config: snappy, durationInFrames: 22 });
  const move = interpolate(frame, [MOVE_AT, MOVE_AT + 20], [0, player.move], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  const showMove = frame >= MOVE_AT;
  const bandChanges = from.band !== to.band;
  const band = bandChanges && frame >= PROMOTE_AT ? to.band : from.band;
  const morph = bandChanges ? spring({ frame: frame - PROMOTE_AT, fps, config: snap }) : 1;
  const isPromoted = index === promoted;
  const highlight = isPromoted ? interpolate(frame, [REORDER_AT, REORDER_AT + 10], [0, 1], clamp) : 0;
  const y = ((from.place - 1) + (to.place - from.place) * reorder) * ROW;
  const lift = to.place !== from.place ? Math.sin(reorder * Math.PI) : 0;

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
        padding: "0 12px 0 10px",
        boxSizing: "border-box",
        borderTop: from.place === 1 && to.place === 1 ? "none" : `1px solid ${c.rule}`,
        background: highlight > 0 ? `rgba(244,244,244,${highlight})` : c.paper,
        zIndex: isPromoted ? 3 : lift > 0 ? 2 : 1,
        transform: `scale(${1 + lift * (isPromoted ? 0.035 : 0)})`,
        clipPath: `inset(0 ${(1 - enter) * 100}% 0 0)`,
        boxShadow: isPromoted && highlight > 0 ? `inset 0 0 0 1.5px rgba(0,0,0,${highlight})` : undefined,
      }}
    >
      <div style={{ width: TIER_WIDTH, display: "flex", justifyContent: "center", transform: `scale(${fishPop * (bandChanges && frame >= PROMOTE_AT ? 0.6 + 0.4 * morph : 1)})` }}>
        <TierFish band={band} cutout={highlight > 0.5 ? c.wash : c.paper} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text weight={isPromoted ? "semibold" : "regular"} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {player.name}
        </Text>
        <Text size="eyebrow" muted={!(bandChanges && frame >= PROMOTE_AT && isPromoted)} weight={bandChanges && frame >= PROMOTE_AT && isPromoted ? "semibold" : "regular"}>
          {caption(index, band)}
        </Text>
      </div>
      <div style={{ width: POINTS_WIDTH }}>
        <Text weight="bold" align="right">
          {formatPoints(player.points + move)}
        </Text>
        <Text size="eyebrow" align="right" weight="semibold" color={player.move > 0 ? c.ink : c.muted} style={{ opacity: showMove ? 1 : 0 }}>
          {player.move > 0 ? `+${player.move}` : `−${Math.abs(player.move)}`}
        </Text>
      </div>
    </div>
  );
}

function ProvisionalRow({ index }: { index: number }) {
  const member = provisional[index]!;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: (players.length + index) * ROW,
        height: ROW,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px 0 10px",
        boxSizing: "border-box",
        borderTop: `1px solid ${c.rule}`,
      }}
    >
      <div style={{ width: TIER_WIDTH, display: "flex", justifyContent: "center" }}>
        <ProvisionalSlot />
      </div>
      <div style={{ flex: 1 }}>
        <Text>{member.name}</Text>
        <Text size="eyebrow" muted>
          Provisional, {member.games} of 5 games
        </Text>
      </div>
      <Text size="eyebrow" muted align="right" style={{ width: POINTS_WIDTH }}>
        no tier
      </Text>
    </div>
  );
}

/** A tier Group's Members tab: the Shark card, then fish, players and Tier points. */
export function TiersScreen() {
  return (
    <Screen title={group.name} tab="groups">
      <GroupTabs active="Members" />
      <SharkCard />
      <Surface style={{ marginTop: 12 }}>
        <div style={{ height: 34, display: "flex", alignItems: "center", gap: 8, padding: "0 12px 0 10px", background: c.wash }}>
          <Text size="eyebrow" muted align="center" style={{ width: TIER_WIDTH }}>
            Tier
          </Text>
          <Text size="eyebrow" muted style={{ flex: 1 }}>
            Player
          </Text>
          <Text size="eyebrow" muted>
            {memberCount}
          </Text>
          <Text size="eyebrow" muted align="right" style={{ width: POINTS_WIDTH }}>
            Points
          </Text>
        </div>
        <div style={{ position: "relative", height: (players.length + provisional.length) * ROW, borderTop: `1px solid ${c.rule}` }}>
          {players.map((_, index) => (
            <RankedRow key={index} index={index} />
          ))}
          {provisional.map((_, index) => (
            <ProvisionalRow key={index} index={index} />
          ))}
        </div>
      </Surface>
    </Screen>
  );
}

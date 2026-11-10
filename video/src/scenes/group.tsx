import { Camera, Link2 } from "lucide-react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

import { group, members } from "../data";
import { Screen } from "../phone";
import { Avatar } from "../primitives/avatar";
import { Hatch } from "../primitives/hatch";
import { Hairline, Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { c, radii, snap, snappy } from "../theme";

export const TYPE_FROM = 12;
export const FRAMES_PER_CHAR = 1.7;
export const MEMBERS_FROM = 50;
export const MEMBER_EVERY = 13;
const ROW = 54;

function MemberRow({ index }: { index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = MEMBERS_FROM + index * MEMBER_EVERY;
  const grow = spring({ frame: frame - at, fps, config: snappy, durationInFrames: 10 });
  const pop = spring({ frame: frame - at - 2, fps, config: snap });
  const member = members[index]!;
  return (
    <div style={{ height: ROW * grow, overflow: "hidden" }}>
      <Hairline inset={66} />
      <div style={{ height: ROW - 1, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
        <Avatar name={member.name} size={38} style={{ transform: `scale(${pop})` }} />
        <div style={{ flex: 1, opacity: interpolate(frame - at, [2, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <Text weight="medium">{member.name}</Text>
          <Text size="meta" muted>
            {member.line}
          </Text>
        </div>
        {index === 0 ? (
          <Text size="meta" weight="semibold">
            You
          </Text>
        ) : null}
      </div>
    </div>
  );
}

export function GroupScreen() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typed = Math.max(0, Math.min(group.name.length, Math.floor((frame - TYPE_FROM) / FRAMES_PER_CHAR)));
  const typing = typed < group.name.length;
  const caretOn = typing || Math.floor(frame / 12) % 2 === 0;
  const joined = Math.max(0, Math.min(members.length, Math.floor((frame - MEMBERS_FROM) / MEMBER_EVERY) + 1));
  const countSnap = spring({ frame: frame - (MEMBERS_FROM + (joined - 1) * MEMBER_EVERY), fps, config: snap });

  return (
    <Screen title="New group" tab="groups">
      <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 6 }}>
        <div style={{ position: "relative", width: 52, height: 52, borderRadius: radii.card, display: "flex", alignItems: "center", justifyContent: "center", color: c.muted }}>
          <Hatch radius={radii.card} />
          <Camera size={22} strokeWidth={2} style={{ position: "relative" }} />
        </div>
        <div>
          <Text size="meta" muted>
            Sport
          </Text>
          <Text weight="semibold">{group.meta}</Text>
        </div>
      </div>

      <Text size="meta" muted style={{ marginTop: 16, marginBottom: 6 }}>
        Group name
      </Text>
      <div
        style={{
          height: 54,
          borderRadius: radii.lg,
          border: `1.5px solid ${c.ink}`,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
        }}
      >
        <Text size="h2" weight="semibold">
          {group.name.slice(0, typed)}
        </Text>
        <div style={{ width: 2, height: 28, marginLeft: 2, background: caretOn ? c.ink : "transparent" }} />
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 20, marginBottom: 8 }}>
        <Text size="title" weight="semibold">
          Members
        </Text>
        <Text size="figure" expanded style={{ transform: `scale(${joined ? 0.85 + countSnap * 0.15 : 1})`, transformOrigin: "right center" }}>
          {joined}
        </Text>
      </div>
      <Surface>
        <div style={{ height: 50, display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
          <div style={{ width: 38, height: 38, borderRadius: 19, border: `1px solid ${c.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Link2 size={18} strokeWidth={2.2} />
          </div>
          <Text weight="semibold">Share invite link</Text>
        </div>
        {members.map((_, index) => (
          <MemberRow key={index} index={index} />
        ))}
      </Surface>
    </Screen>
  );
}

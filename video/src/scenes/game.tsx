import { Check, MapPin } from "lucide-react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

import { game, group, players } from "../data";
import { Screen } from "../phone";
import { Avatar } from "../primitives/avatar";
import { Hatch } from "../primitives/hatch";
import { Hairline, Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { c, radii, snap } from "../theme";

export const SEATS_FROM = 20;
export const SEAT_EVERY = 7.5;
export const seatAt = (index: number) => Math.round(SEATS_FROM + index * SEAT_EVERY);
export const FULL_AT = seatAt(players.length - 1) + 8;

function FieldGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={c.muted} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M12 4v16" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function Seat({ index }: { index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const at = seatAt(index);
  const taken = frame >= at;
  const pop = spring({ frame: frame - at, fps, config: snap });
  const player = players[index]!;
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          position: "relative",
          height: 56,
          borderRadius: radii.lg,
          background: taken ? c.ink : c.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${taken ? 0.82 + pop * 0.18 : 1})`,
        }}
      >
        {taken ? (
          <Avatar name={player.name} size={32} solid style={{ border: `1px solid ${c.hairline}`, background: c.raised }} />
        ) : (
          <>
            <Hatch radius={radii.lg} />
            <Text size="lead" color={c.faint} style={{ position: "relative" }}>
              +
            </Text>
          </>
        )}
      </div>
      <Text size="eyebrow" align="center" color={taken ? c.ink : c.faint} style={{ marginTop: 5, overflow: "hidden", textOverflow: "ellipsis" }}>
        {taken ? player.short : "Open"}
      </Text>
    </div>
  );
}

export function GameScreen() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const count = players.filter((_, index) => frame >= seatAt(index)).length;
  const tick = spring({ frame: frame - seatAt(Math.max(0, count - 1)), fps, config: snap });
  const full = spring({ frame: frame - FULL_AT, fps, config: snap });
  const isFull = frame >= FULL_AT;

  return (
    <Screen title={group.name}>
      <Surface style={{ padding: "18px 18px 16px", marginTop: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <FieldGlyph />
          <Text size="meta" muted>
            {game.format}
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 12 }}>
          <Text size="heroTime" expanded>
            {game.time}
          </Text>
          <Text size="title" weight="semibold">
            {game.meridiem}
          </Text>
        </div>
        <Text size="lead" weight="medium" style={{ marginTop: 6 }}>
          {game.day}
        </Text>
        <div style={{ margin: "14px 0 12px" }}>
          <Hairline />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MapPin size={18} strokeWidth={2} />
          <div style={{ flex: 1 }}>
            <Text weight="semibold">{game.venue}</Text>
            <Text size="meta" muted>
              {game.pitch}
            </Text>
          </div>
          <div>
            <Text weight="semibold" align="right">
              {game.price}
            </Text>
            <Text size="meta" muted align="right">
              per player
            </Text>
          </div>
        </div>
      </Surface>

      <Surface style={{ marginTop: 14, padding: "16px 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <Text size="title" weight="semibold">
              Players
            </Text>
            <div style={{ height: 18, marginTop: 2 }}>
              {isFull ? (
                <div style={{ display: "flex", alignItems: "center", gap: 5, transform: `scale(${0.8 + full * 0.2})`, transformOrigin: "left center" }}>
                  <Check size={15} strokeWidth={2.6} />
                  <Text size="meta" weight="semibold">
                    Game full
                  </Text>
                </div>
              ) : (
                <Text size="meta" muted>
                  {players.length - count} spots left
                </Text>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <Text size="statTotal" expanded style={{ transform: `scale(${count ? 0.88 + tick * 0.12 : 1})`, transformOrigin: "right bottom" }}>
              {count}
            </Text>
            <Text size="statTotal" expanded color={c.faint}>
              /{players.length}
            </Text>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px 8px" }}>
          {players.map((_, index) => (
            <Seat key={index} index={index} />
          ))}
        </div>
      </Surface>
    </Screen>
  );
}

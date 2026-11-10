import { Check, MapPin } from "lucide-react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

import { game, group, players } from "../data";
import { Screen } from "../phone";
import { Avatar } from "../primitives/avatar";
import { Hatch } from "../primitives/hatch";
import { Text } from "../primitives/text";
import { c, radii, snap } from "../theme";

export const SEATS_FROM = 24;
export const SEAT_EVERY = 8.5;
export const seatAt = (index: number) => Math.round(SEATS_FROM + index * SEAT_EVERY);
export const FULL_AT = seatAt(players.length - 1) + 8;

function FieldGlyph({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
          height: 66,
          borderRadius: radii.lg,
          background: taken ? c.ink : c.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${taken ? 0.82 + pop * 0.18 : 1})`,
        }}
      >
        {taken ? (
          <Avatar name={player.name} size={34} solid style={{ border: `1px solid ${c.hairline}`, background: c.raised }} />
        ) : (
          <>
            <Hatch radius={radii.lg} />
            <Text size="lead" color={c.faint} style={{ position: "relative" }}>
              +
            </Text>
          </>
        )}
      </div>
      <Text size="eyebrow" align="center" color={taken ? c.ink : c.faint} style={{ marginTop: 6, overflow: "hidden", textOverflow: "ellipsis" }}>
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
  const fullAt = FULL_AT;
  const full = spring({ frame: frame - fullAt, fps, config: snap });

  return (
    <Screen title={group.name} tab="games">
      <div style={{ background: c.ink, color: c.paper, borderRadius: radii.surface, padding: "20px 20px 18px", marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <FieldGlyph color={c.dim} />
          <Text size="meta" color={c.dim}>
            {game.sport}
          </Text>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 14 }}>
          <Text size="heroTime" expanded color={c.paper}>
            {game.time}
          </Text>
          <Text size="title" weight="semibold" color={c.paper}>
            {game.meridiem}
          </Text>
        </div>
        <Text size="lead" weight="medium" color={c.paper} style={{ marginTop: 8 }}>
          {game.day}
        </Text>
        <div style={{ height: 1, background: c.hairline, margin: "16px 0 14px" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MapPin size={18} color={c.paper} strokeWidth={2} />
          <div style={{ flex: 1 }}>
            <Text weight="semibold" color={c.paper}>
              {game.venue}
            </Text>
            <Text size="meta" color={c.dim}>
              {game.pitch}
            </Text>
          </div>
          <div>
            <Text weight="semibold" color={c.paper} align="right">
              {game.price}
            </Text>
            <Text size="meta" color={c.dim} align="right">
              per player
            </Text>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 26, marginBottom: 14 }}>
        <div>
          <Text size="title" weight="semibold">
            Players
          </Text>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, height: 18 }}>
            {count === players.length ? (
              <div style={{ display: "flex", alignItems: "center", gap: 5, transform: `scale(${0.8 + full * 0.2})`, transformOrigin: "left center", opacity: Math.min(1, full * 2) }}>
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
          <Text
            size="statTotal"
            expanded
            style={{ transform: `scale(${count ? 0.88 + tick * 0.12 : 1})`, transformOrigin: "right bottom" }}
          >
            {count}
          </Text>
          <Text size="statTotal" expanded color={c.faint}>
            /{players.length}
          </Text>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "14px 8px" }}>
        {players.map((_, index) => (
          <Seat key={index} index={index} />
        ))}
      </div>
    </Screen>
  );
}

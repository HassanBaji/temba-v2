import { spacing } from "@repo/design-tokens";
import type { FootballRosterRow } from "@repo/domain/football-game-details";
import { KICK_ACTION } from "@repo/domain/game-copy";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { Card } from "../home/card";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Text } from "../primitives/text";

function RosterLine({
  row,
  onOpenPlayer,
  onKick,
}: {
  row: FootballRosterRow;
  onOpenPlayer?: (userId: string) => void;
  onKick?: (userId: string) => void;
}) {
  const body = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text size="meta" tone="muted" width="expanded" style={{ minWidth: 20 }}>
        {String(row.place)}
      </Text>
      <Avatar name={row.name} uri={row.image} size="lg" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="medium" numberOfLines={1}>
          {row.name}
        </Text>
        {row.isViewer ? (
          <Text size="meta" tone="muted">
            You
          </Text>
        ) : null}
      </View>
    </View>
  );
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: spacing.surface,
        paddingVertical: 10,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        {onOpenPlayer ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={row.name}
            onPress={() => onOpenPlayer(row.id)}
          >
            {body}
          </Pressable>
        ) : (
          body
        )}
      </View>
      {row.kickable && onKick ? (
        <Button
          label={KICK_ACTION}
          accessibilityLabel={`${KICK_ACTION} ${row.name}`}
          size="sm"
          variant="outline"
          onPress={() => onKick(row.id)}
        />
      ) : null}
    </View>
  );
}

export function FootballRosterCard({
  rows,
  openSpots,
  count,
  cap,
  onOpenPlayer,
  onKick,
}: {
  rows: readonly FootballRosterRow[];
  openSpots: number;
  count: number;
  cap: number | null;
  onOpenPlayer?: (userId: string) => void;
  onKick?: (userId: string) => void;
}) {
  return (
    <Card
      title="Players"
      meta={cap == null ? String(count) : `${count}/${cap}`}
      flush
    >
      {rows.length === 0 ? (
        <View style={{ padding: spacing.surface }}>
          <Text size="meta" tone="muted">
            Nobody has joined yet.
          </Text>
        </View>
      ) : (
        rows.map((row) => (
          <Fragment key={row.id}>
            <Hairline />
            <RosterLine row={row} onOpenPlayer={onOpenPlayer} onKick={onKick} />
          </Fragment>
        ))
      )}
      {openSpots > 0 ? (
        <>
          <Hairline />
          <View style={{ padding: spacing.surface }}>
            <Text size="meta" tone="muted">
              {openSpots === 1 ? "1 spot open" : `${openSpots} spots open`}
            </Text>
          </View>
        </>
      ) : null}
    </Card>
  );
}

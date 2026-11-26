import type { FootballPickStatus } from "@repo/domain/football-lineup";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { DraftTag } from "./draft-card";

/**
 * What the Organizer's draft card and a Side captain's Game screen show
 * while a Captain pick runs (ADR-0109): the pick in place of the answers,
 * and the way into the Pick room.
 */
export function PickInProgressCard({
  status,
  onOpen,
}: {
  status: Exclude<FootballPickStatus, "done">;
  onOpen: () => void;
}) {
  const colors = useColors();
  const messages = useMessages();
  const m = messages.football.pick.inProgress;
  return (
    <Surface style={{ gap: 12, borderColor: colors.ink }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <DraftTag label={messages.football.draft.tag} />
        <Text weight="semibold" accessibilityRole="header" style={{ flex: 1 }}>
          {m.title}
        </Text>
      </View>
      <Text size="meta" tone="muted">
        {status === "live" ? m.live : m.waiting}
      </Text>
      <Button label={m.open} size="lg" onPress={onOpen} />
    </Surface>
  );
}

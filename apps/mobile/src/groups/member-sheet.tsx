import { View } from "react-native";

import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import type { MemberSheetView } from "./group-home-model";

export function MemberSheet({
  member,
  onClose,
  onSetLevel,
}: {
  member: MemberSheetView | null;
  onClose: () => void;
  onSetLevel: () => void;
}) {
  return (
    <Sheet visible={member != null} onClose={onClose} title={member?.name}>
      {member ? (
        <View style={{ gap: 14 }}>
          <Text size="meta" tone="muted">
            {member.summary}
          </Text>
          <View
            accessible
            accessibilityLabel={
              member.letter
                ? `Level ${member.letter} ${member.level ?? ""}`.trim()
                : "No Level yet"
            }
            style={{ flexDirection: "row", alignItems: "baseline", gap: 12 }}
          >
            <Text size="levelBand" width="expanded" weight="bold">
              {member.letter ?? "–"}
            </Text>
            {member.level ? (
              <Text size="title" width="expanded" weight="bold">
                {member.level}
              </Text>
            ) : null}
          </View>
          {member.provisionalNote ? (
            <Text tone="muted">{member.provisionalNote}</Text>
          ) : null}
          {member.latestSet ? (
            <Surface radius="md" style={{ gap: 2 }}>
              <Text size="meta" tone="muted">
                Latest Level set
              </Text>
              <Text>{member.latestSet}</Text>
            </Surface>
          ) : null}
          <Button label="Set Level" size="lg" onPress={onSetLevel} />
        </View>
      ) : null}
    </Sheet>
  );
}

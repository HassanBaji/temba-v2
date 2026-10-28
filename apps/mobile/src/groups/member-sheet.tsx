import {
  REMOVE_UNCLAIMED_PLAYER_ACTION,
  RENAME_UNCLAIMED_PLAYER_ACTION,
} from "@repo/domain/add-player-by-phone";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import type { MemberSheetView } from "./group-home-model";

export function MemberSheet({
  member,
  onClose,
  onSetLevel,
  onViewProfile,
  onRename,
  onRemove,
}: {
  member: MemberSheetView | null;
  onClose: () => void;
  onSetLevel?: () => void;
  onViewProfile?: () => void;
  onRename?: () => void;
  onRemove?: () => void;
}) {
  return (
    <Sheet visible={member != null} onClose={onClose} title={member?.name}>
      {member ? (
        <View style={{ gap: 14 }}>
          {member.unclaimed ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <NotOnTembaMark />
              {member.phoneMasked ? (
                <Text size="meta" tone="muted">
                  {member.phoneMasked}
                </Text>
              ) : null}
            </View>
          ) : null}
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
          {onSetLevel ? (
            <Button label="Set Level" size="lg" onPress={onSetLevel} />
          ) : null}
          {onViewProfile ? (
            <Button
              label="View profile"
              size="lg"
              variant="outline"
              onPress={onViewProfile}
            />
          ) : null}
          {onRename ? (
            <Button
              label={RENAME_UNCLAIMED_PLAYER_ACTION}
              size="lg"
              variant="outline"
              onPress={onRename}
            />
          ) : null}
          {onRemove ? (
            <Button
              label={REMOVE_UNCLAIMED_PLAYER_ACTION}
              size="lg"
              variant="outline"
              onPress={onRemove}
            />
          ) : null}
        </View>
      ) : null}
    </Sheet>
  );
}

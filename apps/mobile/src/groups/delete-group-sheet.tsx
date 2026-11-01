import { colors, radii } from "@repo/design-tokens";
import {
  groupDeleteNameMatches,
  groupDeleteSheetCopy,
} from "@repo/domain/group-settings";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

function StatCell({
  value,
  label,
  first,
}: {
  value: number;
  label: string;
  first: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      style={{
        flex: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 2,
        borderLeftWidth: first ? 0 : hairline,
        borderColor: colors.rule,
      }}
    >
      <Text size="figure" width="expanded" weight="bold">
        {value}
      </Text>
      <Text size="eyebrow" tone="muted">
        {label}
      </Text>
    </View>
  );
}

/** Design "Group create and edit flow" 04: type the name, then delete. */
export function DeleteGroupSheet({
  visible,
  name,
  gameCount,
  memberCount,
  seasonCount,
  pending,
  onDelete,
  onClose,
}: {
  visible: boolean;
  name: string | null;
  gameCount: number;
  memberCount: number;
  seasonCount: number;
  pending: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (visible) {
      setTyped("");
    }
  }, [visible]);
  const copy = groupDeleteSheetCopy({
    name,
    gameCount,
    memberCount,
    seasonCount,
  });
  const matches = groupDeleteNameMatches(name, typed);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={copy.title}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ gap: 16 }}>
        <Text size="meta" tone="muted">
          {copy.description}
        </Text>
        <View
          style={{
            flexDirection: "row",
            borderRadius: radii.card,
            borderWidth: hairline,
            borderColor: colors.rule,
            overflow: "hidden",
          }}
        >
          {copy.stats.map((stat, index) => (
            <StatCell
              key={stat.label}
              value={stat.value}
              label={stat.label}
              first={index === 0}
            />
          ))}
        </View>
        <TextField
          label={copy.confirmPrompt}
          value={typed}
          onChangeText={setTyped}
          placeholder={copy.confirmPlaceholder}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!pending}
          returnKeyType="done"
          onSubmitEditing={matches ? onDelete : undefined}
        />
        <Button
          label={copy.deleteLabel}
          size="lg"
          pending={pending}
          disabled={!matches}
          onPress={onDelete}
        />
        <Button
          label={copy.keepLabel}
          size="lg"
          variant="outline"
          disabled={pending}
          onPress={onClose}
        />
      </View>
    </Sheet>
  );
}

import { GROUP_JOIN_NOTE_MAX_LENGTH } from "@repo/domain/group-admin";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";

export function RequestJoinSheet({
  visible,
  pending,
  onSend,
  onClose,
}: {
  visible: boolean;
  pending: boolean;
  onSend: (note: string) => void;
  onClose: () => void;
}) {
  const copy = useMessages().group.admin.requestJoinSheet;
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setNote("");
    }
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose} title={copy.title}>
      <View style={{ gap: 16 }}>
        <Text size="meta" tone="muted">
          {copy.description}
        </Text>
        <TextField
          value={note}
          onChangeText={setNote}
          placeholder={copy.notePlaceholder}
          accessibilityLabel={copy.notePlaceholder}
          maxLength={GROUP_JOIN_NOTE_MAX_LENGTH}
          multiline
          editable={!pending}
        />
        <Button
          label={copy.submitLabel}
          size="lg"
          pending={pending}
          onPress={() => onSend(note)}
        />
      </View>
    </Sheet>
  );
}

import {
  GROUP_JOIN_NOTE_MAX_LENGTH,
  GROUP_REQUEST_JOIN_SHEET,
} from "@repo/domain/group-admin";
import { useEffect, useState } from "react";
import { View } from "react-native";

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
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setNote("");
    }
  }, [visible]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={GROUP_REQUEST_JOIN_SHEET.title}
    >
      <View style={{ gap: 16 }}>
        <Text size="meta" tone="muted">
          {GROUP_REQUEST_JOIN_SHEET.description}
        </Text>
        <TextField
          value={note}
          onChangeText={setNote}
          placeholder={GROUP_REQUEST_JOIN_SHEET.notePlaceholder}
          accessibilityLabel={GROUP_REQUEST_JOIN_SHEET.notePlaceholder}
          maxLength={GROUP_JOIN_NOTE_MAX_LENGTH}
          multiline
          editable={!pending}
        />
        <Button
          label={GROUP_REQUEST_JOIN_SHEET.submitLabel}
          size="lg"
          pending={pending}
          onPress={() => onSend(note)}
        />
      </View>
    </Sheet>
  );
}

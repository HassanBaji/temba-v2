import { View } from "react-native";

import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";

export type ConfirmRequest = {
  title: string;
  description: string;
  details?: readonly string[];
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
};

export function ConfirmSheet({
  request,
  pending,
  onClose,
}: {
  request: ConfirmRequest | null;
  pending: boolean;
  onClose: () => void;
}) {
  return (
    <Sheet visible={request != null} onClose={onClose} title={request?.title}>
      <Text size="meta" tone="muted">
        {request?.description}
      </Text>
      {request?.details?.map((line) => (
        <Text key={line} size="meta" tone="muted">
          {`• ${line}`}
        </Text>
      ))}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label={request?.cancelLabel ?? "Keep"}
          variant="outline"
          onPress={onClose}
        />
        <Button
          label={request?.confirmLabel ?? ""}
          pending={pending}
          onPress={() => request?.onConfirm()}
        />
      </View>
    </Sheet>
  );
}

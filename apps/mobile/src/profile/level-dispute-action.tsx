import {
  LEVEL_DISPUTE_NOTE_MAX_LENGTH,
  levelDisputeCanSubmit,
  levelDisputeSheetCopy,
} from "@repo/domain/level-dispute";
import type { RatingHistoryLine } from "@repo/domain/rating-history";
import { useState } from "react";
import { View } from "react-native";

import { FieldError } from "../create-game/chips";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

/** Dispute a Level adjustment from its Rating history line, or what became of the dispute. */
export function LevelDisputeAction({
  dispute,
}: {
  dispute: NonNullable<RatingHistoryLine["dispute"]>;
}) {
  const locale = useLocale();
  const m = useMessages();
  const toast = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const sheet = levelDisputeSheetCopy(locale);

  const raise = api.ratings.disputeLevel.useMutation({
    onSuccess: async () => {
      toast.show(m.rating.levelDispute.sent);
      setOpen(false);
      await utils.ratings.history.invalidate();
    },
  });

  if (dispute.kind === "status") {
    return (
      <Text size="eyebrow" tone="muted">
        {dispute.line}
      </Text>
    );
  }
  const levelOverrideId = dispute.levelOverrideId;
  const canSubmit = levelDisputeCanSubmit(note) && !raise.isPending;
  return (
    <>
      <View style={{ alignItems: "flex-start" }}>
        <Button
          label={dispute.label}
          variant="outline"
          size="sm"
          onPress={() => {
            raise.reset();
            setNote("");
            setOpen(true);
          }}
        />
      </View>
      <Sheet
        visible={open}
        onClose={() => {
          if (!raise.isPending) {
            setOpen(false);
          }
        }}
        title={sheet.title}
        subtitle={sheet.description}
        keyboardShouldPersistTaps="handled"
        footer={
          <View style={{ gap: 8 }}>
            <FieldError message={raise.error?.message} />
            <Button
              label={sheet.submit}
              size="lg"
              pending={raise.isPending}
              disabled={!canSubmit}
              onPress={() => {
                if (canSubmit) {
                  raise.mutate({ levelOverrideId, note: note.trim() });
                }
              }}
            />
          </View>
        }
      >
        <TextField
          label={sheet.noteLabel}
          value={note}
          onChangeText={setNote}
          placeholder={sheet.notePlaceholder}
          maxLength={LEVEL_DISPUTE_NOTE_MAX_LENGTH}
          multiline
          editable={!raise.isPending}
        />
      </Sheet>
    </>
  );
}

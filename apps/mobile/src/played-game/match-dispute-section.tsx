import {
  MATCH_DISPUTE_NOTE_MAX_LENGTH,
  matchDisputeCanSubmit,
  matchDisputeSheetCopy,
  matchDisputeView,
  type MatchDisputeState,
} from "@repo/domain/match-dispute";
import { useState } from "react";
import { View } from "react-native";

import { FieldError } from "../create-game/chips";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

/** Dispute a played Match that counted for Temba Level, or the line saying one waits. */
export function MatchDisputeSection({
  match,
}: {
  match: (MatchDisputeState & { id: string }) | null | undefined;
}) {
  const locale = useLocale();
  const m = useMessages();
  const toast = useToast();
  const utils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const view = matchDisputeView(match, locale);
  const sheet = matchDisputeSheetCopy(locale);

  const dispute = api.games.disputeMatchResult.useMutation({
    onSuccess: async () => {
      toast.show(m.rating.dispute.sent);
      setOpen(false);
      await utils.games.byId.invalidate();
    },
  });

  if (view.kind === "none" || !match) {
    return null;
  }
  if (view.kind === "open") {
    return (
      <Surface>
        <Text size="meta" tone="muted">
          {view.line}
        </Text>
      </Surface>
    );
  }
  const canSubmit = matchDisputeCanSubmit(note) && !dispute.isPending;
  return (
    <>
      <Surface style={{ gap: 8 }}>
        <Button
          label={view.label}
          variant="outline"
          onPress={() => {
            dispute.reset();
            setNote("");
            setOpen(true);
          }}
        />
        <Text size="meta" tone="muted">
          {view.hint}
        </Text>
      </Surface>
      <Sheet
        visible={open}
        onClose={() => {
          if (!dispute.isPending) {
            setOpen(false);
          }
        }}
        title={sheet.title}
        subtitle={sheet.description}
        keyboardShouldPersistTaps="handled"
        footer={
          <View style={{ gap: 8 }}>
            <FieldError message={dispute.error?.message} />
            <Button
              label={sheet.submit}
              size="lg"
              pending={dispute.isPending}
              disabled={!canSubmit}
              onPress={() => {
                if (canSubmit) {
                  dispute.mutate({ matchId: match.id, note: note.trim() });
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
          maxLength={MATCH_DISPUTE_NOTE_MAX_LENGTH}
          multiline
          editable={!dispute.isPending}
        />
      </Sheet>
    </>
  );
}

import {
  everyoneWhoPlayed,
  GAME_NOTE_MAX_LENGTH,
  noteCharacterCount,
  noteDraftIsSavable,
  noteReadersHint,
  type GameAlbum,
  type GameNoteVisibility,
} from "@repo/domain/game-album";
import { Lock, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { ChoiceCard } from "../primitives/choice-card";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";

const ICON = 17;

/**
 * Your one note on a played Game. The two cards pick who reads it; the hint,
 * the counter and the save button follow the choice, so the last thing you
 * read before saving says who will read it.
 */
export function NoteSheet({
  visible,
  album,
  context,
  pending,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  album: GameAlbum;
  /** The Game in a line: its result, the score, who you played with. */
  context: string | null;
  pending: boolean;
  onClose: () => void;
  onSave: (body: string, visibility: GameNoteVisibility) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const locale = useLocale();
  const colors = useColors();
  const toast = useToast();
  const m = useMessages().gameAlbum.note;
  const mine = album.notes.mine;
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<GameNoteVisibility>("private");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (visible) {
      setBody(mine?.body ?? "");
      setVisibility(mine?.visibility ?? "private");
      setConfirmDelete(false);
    }
  }, [visible, mine]);

  const isPrivate = visibility === "private";
  const players = album.readers.length + 1;

  const save = async () => {
    if (await onSave(body, visibility)) {
      toast.show(isPrivate ? m.saved : m.shared);
      onClose();
    }
  };

  const remove = async () => {
    if (await onDelete()) {
      toast.show(m.deleted);
      onClose();
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={m.title}
      subtitle={[context, m.subtitle].filter(Boolean).join(" ")}
      closeButton
      tall
      keyboardShouldPersistTaps="handled"
      footer={
        <Button
          label={isPrivate ? m.savePrivate : m.savePublic(players)}
          size="lg"
          pending={pending}
          disabled={!noteDraftIsSavable(body)}
          icon={
            isPrivate ? (
              <Lock size={ICON} color={colors.onControl} />
            ) : (
              <Users size={ICON} color={colors.onControl} />
            )
          }
          onPress={() => void save()}
        />
      }
    >
      <Text size="meta" tone="muted">
        {m.who}
      </Text>
      <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
        <ChoiceCard
          role="radio"
          selected={!isPrivate}
          title={everyoneWhoPlayed(album, locale)}
          description={m.everyoneHint}
          leading={Users}
          onPress={() => setVisibility("public")}
        />
        <ChoiceCard
          role="radio"
          selected={isPrivate}
          title={m.onlyMe}
          description={m.onlyMeHint}
          leading={Lock}
          onPress={() => setVisibility("private")}
        />
      </View>
      <TextField
        label={m.fieldLabel}
        value={body}
        onChangeText={setBody}
        placeholder={m.placeholder}
        multiline
        maxLength={GAME_NOTE_MAX_LENGTH}
      />
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text size="eyebrow" tone="muted" style={{ flexShrink: 1 }}>
          {isPrivate ? m.privateHint : noteReadersHint(album.readers, locale)}
        </Text>
        <Text size="eyebrow" tone="muted">
          {noteCharacterCount(body, locale)}
        </Text>
      </View>
      {mine ? (
        confirmDelete ? (
          <View style={{ gap: 8 }}>
            <Text weight="semibold">{m.deleteTitle}</Text>
            <Text size="meta" tone="muted">
              {m.deleteBody}
            </Text>
            <Button
              label={m.deleteConfirm}
              variant="outline"
              pending={pending}
              onPress={() => void remove()}
            />
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setConfirmDelete(true)}
            hitSlop={12}
            style={{ alignSelf: "flex-start" }}
          >
            <Text size="meta" weight="semibold">
              {m.delete}
            </Text>
          </Pressable>
        )
      ) : null}
    </Sheet>
  );
}

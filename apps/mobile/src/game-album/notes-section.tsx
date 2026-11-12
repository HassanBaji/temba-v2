import { radii, sizes } from "@repo/design-tokens";
import {
  noteTimeLabel,
  notesCountLabel,
  notesFootnote,
  type GameAlbum,
  type GameAlbumNote,
} from "@repo/domain/game-album";
import { Lock, Pencil } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { InitialsTile } from "../primitives/initials-tile";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { SectionHeading } from "./section-heading";

const INSET = 14;

function NoteRow({ note }: { note: GameAlbumNote }) {
  const locale = useLocale();
  const colors = useColors();
  const m = useMessages().gameAlbum.notes;
  const time = noteTimeLabel(note.createdAt, locale);
  const privateNote = note.isMine && note.visibility === "private";
  return (
    <View style={{ flexDirection: "row", gap: 12, padding: INSET }}>
      <InitialsTile
        name={note.author.name}
        uri={note.author.image}
        size="xs"
        tone={note.isMine ? "control" : "inverse"}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {note.isMine ? m.you : note.author.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            {privateNote ? <Lock size={11} color={colors.muted} /> : null}
            <Text size="eyebrow" tone="muted">
              {privateNote ? m.privateTime(time) : time}
            </Text>
          </View>
        </View>
        <Text>{note.body}</Text>
      </View>
    </View>
  );
}

function WriteCard({
  album,
  onWrite,
}: {
  album: GameAlbum;
  onWrite: () => void;
}) {
  const colors = useColors();
  const m = useMessages().gameAlbum.notes;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${m.writeTitle}. ${m.writeHint}`}
      onPress={onWrite}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: INSET,
        borderRadius: radii.card,
        overflow: "hidden",
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Hatch radius={radii.card} />
      <InitialsTile
        name={album.viewer.person?.name ?? ""}
        uri={album.viewer.person?.image}
        size="xs"
      />
      <View style={{ flex: 1 }}>
        <Text weight="semibold">{m.writeTitle}</Text>
        <Text size="eyebrow" tone="muted">
          {m.writeHint}
        </Text>
      </View>
      <Pencil size={sizes.iconRow} color={colors.ink} />
    </Pressable>
  );
}

/**
 * The notes on a played Game: yours first with who reads it and Edit, then
 * the other players' public notes, oldest first. Another player's private
 * note is never listed, and the footnote never says one exists.
 */
export function NotesSection({
  album,
  onWrite,
}: {
  album: GameAlbum;
  onWrite: () => void;
}) {
  const locale = useLocale();
  const colors = useColors();
  const m = useMessages().gameAlbum.notes;
  const mine = album.notes.mine;
  const notes = [...(mine ? [mine] : []), ...album.notes.shared];
  const footnote = notesFootnote(album, new Date(), locale);

  return (
    <View style={{ gap: 12 }}>
      <SectionHeading title={m.title} count={notesCountLabel(album, locale)} />
      {!mine && album.viewer.canWriteNote ? (
        <WriteCard album={album} onWrite={onWrite} />
      ) : null}
      {notes.length > 0 ? (
        <View
          style={{
            borderRadius: radii.card,
            borderWidth: hairline,
            borderColor: colors.rule,
            overflow: "hidden",
          }}
        >
          {notes.map((note, index) => (
            <Fragment key={note.id}>
              {index > 0 ? <Hairline /> : null}
              <NoteRow note={note} />
              {note.isMine ? (
                <>
                  <Hairline />
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: INSET,
                      paddingVertical: 10,
                      backgroundColor: colors.wash,
                    }}
                  >
                    <Text size="eyebrow" tone="muted" style={{ flexShrink: 1 }}>
                      {note.visibility === "private"
                        ? m.onlyYouCanRead
                        : m.everyoneCanRead}
                    </Text>
                    {album.viewer.canWriteNote ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={m.editNote}
                        onPress={onWrite}
                        hitSlop={12}
                      >
                        <Text size="eyebrow" weight="semibold">
                          {m.edit}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </>
              ) : null}
            </Fragment>
          ))}
        </View>
      ) : null}
      {!mine && notes.length === 0 && album.viewer.canWriteNote ? (
        <Text size="eyebrow" tone="muted">
          {m.emptyCaption(album.readers.length + 1)}
        </Text>
      ) : footnote ? (
        <Text size="eyebrow" tone="muted">
          {footnote}
        </Text>
      ) : null}
    </View>
  );
}

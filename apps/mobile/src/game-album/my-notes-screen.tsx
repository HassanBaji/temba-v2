import { radii } from "@repo/design-tokens";
import {
  filterMyNotes,
  myNoteGameLine,
  myNotesByMonth,
  myNotesCounts,
  noteScoreLine,
  type MyGameNote,
  type MyNotesTab,
} from "@repo/domain/game-album";
import { useRouter } from "expo-router";
import { Lock, Users } from "lucide-react-native";
import { Fragment, useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import { gamePath } from "../games/games-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { api } from "../trpc/react";
import { useColors } from "../theme/theme-provider";

const TABS: MyNotesTab[] = ["all", "private", "public"];

function NoteEntry({ note, onOpen }: { note: MyGameNote; onOpen: () => void }) {
  const locale = useLocale();
  const colors = useColors();
  const m = useMessages().gameAlbum.myNotes;
  const score = noteScoreLine(note.game.sets);
  const privateNote = note.visibility === "private";
  const line = myNoteGameLine(note, locale);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        score,
        line,
        privateNote ? m.onlyYou : m.shared,
        note.body,
      ]
        .filter(Boolean)
        .join(". ")}
      accessibilityHint={m.openGame}
      onPress={onOpen}
      style={({ pressed }) => ({
        padding: 14,
        gap: 6,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ResultMark
          variant={note.game.outcome ?? "not-played"}
          size={12}
          decorative
        />
        {score ? (
          <Text size="meta" width="expanded" weight="bold">
            {score}
          </Text>
        ) : null}
        <Text size="eyebrow" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {line}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          {privateNote ? (
            <Lock size={11} color={colors.muted} />
          ) : (
            <Users size={11} color={colors.muted} />
          )}
          <Text size="eyebrow" tone="muted">
            {privateNote ? m.onlyYou : m.shared}
          </Text>
        </View>
      </View>
      <Text>{note.body}</Text>
    </Pressable>
  );
}

/** Every note you wrote, grouped by month, newest first. Only you see this page. */
export function MyNotesScreen() {
  const router = useRouter();
  const locale = useLocale();
  const colors = useColors();
  const m = useMessages().gameAlbum.myNotes;
  const [tab, setTab] = useState<MyNotesTab>("all");
  const [refreshing, setRefreshing] = useState(false);
  const query = api.gameAlbum.myNotes.useQuery(undefined, {
    refetchOnWindowFocus: "always",
  });
  const notes = query.data ?? [];
  const counts = myNotesCounts(notes);
  const months = myNotesByMonth(filterMyNotes(notes, tab), locale);
  const tabLabel = (key: MyNotesTab) =>
    key === "all"
      ? m.all(counts.all)
      : key === "private"
        ? m.private(counts.private)
        : m.public(counts.public);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  return (
    <Screen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <View style={{ gap: 8 }}>
        <ScreenHeader nav="back" fallback="/profile" title={m.title} />
        <Text size="meta" tone="muted">
          {m.subtitle(counts.all)}
        </Text>
      </View>

      <View
        accessibilityRole="tablist"
        accessibilityLabel={m.tabs}
        style={{
          flexDirection: "row",
          gap: 20,
          borderBottomWidth: hairline,
          borderBottomColor: colors.rule,
        }}
      >
        {TABS.map((key) => {
          const selected = key === tab;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setTab(key)}
              style={{
                paddingVertical: 10,
                borderBottomWidth: 2,
                borderBottomColor: selected ? colors.ink : "transparent",
                marginBottom: -hairline,
              }}
            >
              <Text
                weight={selected ? "semibold" : "regular"}
                tone={selected ? "default" : "muted"}
              >
                {tabLabel(key)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? (
        <Skeleton height={220} />
      ) : months.length === 0 ? (
        <View style={{ gap: 4, paddingVertical: 24 }}>
          <Text weight="semibold">
            {notes.length === 0 ? m.empty : m.emptyFiltered}
          </Text>
          {notes.length === 0 ? (
            <Text size="meta" tone="muted">
              {m.emptyHint}
            </Text>
          ) : null}
        </View>
      ) : (
        months.map((month) => (
          <View key={month.key} style={{ gap: 8 }}>
            <Text size="eyebrow" tone="muted" accessibilityRole="header">
              {month.label}
            </Text>
            <View
              style={{
                borderRadius: radii.card,
                borderWidth: hairline,
                borderColor: colors.rule,
                overflow: "hidden",
              }}
            >
              {month.notes.map((note, index) => (
                <Fragment key={note.id}>
                  {index > 0 ? <Hairline /> : null}
                  <NoteEntry
                    note={note}
                    onOpen={() => router.push(gamePath(note.gameId))}
                  />
                </Fragment>
              ))}
            </View>
          </View>
        ))
      )}
    </Screen>
  );
}

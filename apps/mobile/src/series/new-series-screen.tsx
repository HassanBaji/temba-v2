import { radii, spacing } from "@repo/design-tokens";
import { groupDisplayName } from "@repo/domain/group-join";
import {
  DEFAULT_SERIES_COLOUR,
  DEFAULT_SERIES_EMBLEM,
  SERIES_NAME_MAX_LENGTH,
  seriesNameError,
  type SeriesColour,
  type SeriesEmblem,
} from "@repo/domain/series";
import { useCallback, useEffect, useRef, useState } from "react";
import { View, type ScrollView, type TextInput } from "react-native";

import { groupSeriesPath } from "../groups/groups-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader, useLeaveScreen } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { useKeyboardVisible } from "../primitives/use-keyboard-visible";
import { api } from "../trpc/react";
import { SeriesBadge } from "./series-badge";
import { SeriesColourPicker, SeriesEmblemPicker } from "./series-pickers";

const RULES = ["social", "game", "draw"] as const;

function PreviewCard({
  name,
  groupName,
  emblem,
  colour,
}: {
  name: string;
  groupName: string;
  emblem: SeriesEmblem;
  colour: SeriesColour;
}) {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <SeriesBadge
        emblem={emblem}
        colour={colour}
        size="preview"
        surface="focus"
      />
      <View style={{ alignSelf: "stretch", gap: 4 }}>
        <Text
          size="h1"
          width="expanded"
          weight="bold"
          tone={name ? "default" : "muted"}
          style={{ textAlign: "center" }}
        >
          {name || m.series.create.namePlaceholder}
        </Text>
        <Text size="meta" tone="muted" style={{ textAlign: "center" }}>
          {groupName}
        </Text>
      </View>
      <View
        style={{
          alignSelf: "stretch",
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          paddingTop: 12,
          borderTopWidth: hairline,
          borderColor: palette.rule,
        }}
      >
        <SeriesBadge
          emblem={emblem}
          colour={colour}
          size="latest"
          count={1}
          surface="focus"
        />
        <Text size="meta" tone="muted" style={{ flex: 1 }}>
          {m.series.create.previewNote}
        </Text>
      </View>
    </View>
  );
}

function Preview(props: React.ComponentProps<typeof PreviewCard>) {
  const m = useMessages();
  return (
    <Surface
      tone="ink"
      accessible
      accessibilityLabel={m.series.page.rowLabel([
        m.series.create.preview,
        props.name || m.series.create.namePlaceholder,
        props.groupName,
      ])}
    >
      <PreviewCard {...props} />
    </Surface>
  );
}

function Rules() {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <Surface padded={false} radius="card">
      {RULES.map((rule, index) => (
        <View
          key={rule}
          accessible
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
            paddingHorizontal: 16,
            paddingVertical: 13,
            borderTopWidth: index === 0 ? 0 : hairline,
            borderColor: palette.rule,
          }}
        >
          <Text size="meta" tone="muted">
            {m.series.create.rules[rule].label}
          </Text>
          <Text
            size="meta"
            weight="semibold"
            style={{ flexShrink: 1, textAlign: "right" }}
          >
            {m.series.create.rules[rule].value}
          </Text>
        </View>
      ))}
    </Surface>
  );
}

function NewSeriesForm({
  groupId,
  groupName,
  runningNames,
}: {
  groupId: string;
  groupName: string;
  runningNames: string[];
}) {
  const m = useMessages();
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const leave = useLeaveScreen(groupSeriesPath(groupId));
  const scrollRef = useRef<ScrollView>(null);
  const nameRef = useRef<TextInput>(null);
  const nameTop = useRef(0);
  const nameFocused = useRef(false);
  const keyboardVisible = useKeyboardVisible();
  const [name, setName] = useState("");
  const [emblem, setEmblem] = useState<SeriesEmblem>(DEFAULT_SERIES_EMBLEM);
  const [colour, setColour] = useState<SeriesColour>(DEFAULT_SERIES_COLOUR);
  const [nameError, setNameError] = useState<string | null>(null);
  const trimmed = name.trim();

  const revealName = useCallback(() => {
    scrollRef.current?.scrollTo({
      y: Math.max(0, nameTop.current - spacing.compact),
    });
  }, []);

  useEffect(() => {
    if (keyboardVisible && nameFocused.current) {
      revealName();
    }
  }, [keyboardVisible, revealName]);

  const showNameError = (message: string) => {
    setNameError(message);
    nameRef.current?.focus();
  };

  const createSeries = api.series.create.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.series.listForGroup.invalidate({ groupId }),
        utils.series.attachOptions.invalidate({ groupId }),
        utils.groups.byId.invalidate({ id: groupId }),
      ]);
      leave();
    },
    onError: (error) => {
      const fieldError = splitTrpcFormError(error).fieldErrors.name;
      if (fieldError) {
        showNameError(fieldError);
        return;
      }
      toast.show(error.message);
    },
  });

  function submit() {
    if (!trimmed || createSeries.isPending) {
      return;
    }
    const error = seriesNameError(trimmed, runningNames, locale);
    if (error) {
      showNameError(error);
      return;
    }
    createSeries.mutate({ groupId, name: trimmed, emblem, colour });
  }

  return (
    <Screen
      scrollRef={scrollRef}
      footer={
        <View style={{ flex: 1, gap: 8 }}>
          <Button
            label={m.series.create.submit}
            size="lg"
            pending={createSeries.isPending}
            disabled={!trimmed}
            onPress={submit}
          />
          <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
            {m.series.create.submitNote}
          </Text>
        </View>
      }
    >
      <ScreenHeader
        nav="back"
        fallback={groupSeriesPath(groupId)}
        title={m.series.create.title}
      />
      <Preview
        name={trimmed}
        groupName={groupName}
        emblem={emblem}
        colour={colour}
      />
      <View
        style={{ gap: 12 }}
        onLayout={({ nativeEvent }) => {
          nameTop.current = nativeEvent.layout.y;
        }}
      >
        <Text size="title" weight="semibold" accessibilityRole="header">
          {m.series.create.nameLabel}
        </Text>
        <View style={{ gap: 8 }}>
          <TextField
            ref={nameRef}
            accessibilityLabel={m.series.create.nameLabel}
            accessibilityHint={m.series.create.nameHint}
            value={name}
            maxLength={SERIES_NAME_MAX_LENGTH}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            error={nameError ?? undefined}
            editable={!createSeries.isPending}
            onChangeText={(next) => {
              setName(next);
              setNameError(null);
            }}
            onFocus={() => {
              nameFocused.current = true;
              revealName();
            }}
            onBlur={() => {
              nameFocused.current = false;
            }}
          />
          <Text size="eyebrow" tone="muted">
            {m.series.create.nameHint}
          </Text>
        </View>
      </View>
      <SeriesEmblemPicker value={emblem} onChange={setEmblem} />
      <SeriesColourPicker value={colour} onChange={setColour} />
      <Rules />
    </Screen>
  );
}

/**
 * New series (1b): a name, an emblem and a colour, with a live preview of the
 * badge. Only a Group approver of a Verified Group stays on it; anyone else is
 * sent back to the Group.
 */
export function NewSeriesScreen({ groupId }: { groupId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const list = api.series.listForGroup.useQuery({ groupId });
  const group = api.groups.byId.useQuery({ id: groupId });
  const leave = useLeaveScreen(groupSeriesPath(groupId));
  const left = useRef(false);
  const refused = list.data
    ? !list.data.enabled || !list.data.canManage
    : false;

  useEffect(() => {
    if (refused && !left.current) {
      left.current = true;
      leave();
    }
  }, [refused, leave]);

  const header = (
    <ScreenHeader
      nav="back"
      fallback={groupSeriesPath(groupId)}
      title={m.series.create.title}
    />
  );
  const error = list.error ?? group.error;

  if (error) {
    return (
      <Screen>
        {header}
        <Notice
          alert
          title={m.series.tab.loadError}
          description={error.message}
          onRetry={() => {
            void list.refetch();
            void group.refetch();
          }}
        />
      </Screen>
    );
  }

  if (!list.data || !group.data || refused) {
    return (
      <Screen>
        {header}
        <Skeleton height={300} radius={radii.surface} />
        <Skeleton height={80} radius={radii.md} />
        <Skeleton height={80} radius={radii.md} />
      </Screen>
    );
  }

  return (
    <NewSeriesForm
      groupId={groupId}
      groupName={groupDisplayName(group.data.name, locale)}
      runningNames={list.data.running.map((series) => series.name)}
    />
  );
}

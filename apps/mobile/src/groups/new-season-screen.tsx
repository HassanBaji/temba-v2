import { radii, sizes } from "@repo/design-tokens";
import { formatDayLabel } from "@repo/domain/game-window";
import {
  SEASON_NAME_MAX_LENGTH,
  formatSeasonRange,
  newSeasonSummaryLine,
  seasonCreatedToast,
  seasonDatesError,
  suggestedSeasonEnd,
  suggestedSeasonName,
  suggestedSeasonStart,
} from "@repo/domain/group-season";
import { useRouter } from "expo-router";
import { CalendarDays } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { monthGrid, monthOfDay } from "../create-game/create-days";
import { DateSheet } from "../create-game/day-field";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api, type RouterOutputs } from "../trpc/react";
import { groupPath, groupSeasonsPath } from "./groups-model";
import { Notice } from "./notice";

type SeasonList = RouterOutputs["groups"]["listSeasons"];

/** A Season may start before today, so the picker opens any month. */
const EARLIEST_PICKABLE_DAY = "2000-01-01";

function DayButton({
  label,
  day,
  onPick,
}: {
  label: string;
  day: string;
  onPick: (day: string) => void;
}) {
  const locale = useLocale();
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthOfDay(day));
  const value = formatDayLabel(day, locale) ?? day;
  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text size="meta" weight="medium">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
        onPress={() => {
          setMonth(monthOfDay(day));
          setOpen(true);
        }}
        style={({ pressed }) => ({
          minHeight: sizes.touchTarget,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingHorizontal: 14,
          borderRadius: radii.md,
          borderWidth: hairline,
          borderColor: colors.rule,
          backgroundColor: pressed ? colors.wash : colors.paper,
        })}
      >
        <Text numberOfLines={1} style={{ flexShrink: 1 }}>
          {value}
        </Text>
        <CalendarDays size={sizes.iconRow} color={colors.muted} />
      </Pressable>
      <DateSheet
        visible={open}
        grid={monthGrid(month, EARLIEST_PICKABLE_DAY, locale)}
        day={day}
        onMonthChange={setMonth}
        onClose={() => setOpen(false)}
        onPick={(next) => {
          setOpen(false);
          onPick(next);
        }}
      />
    </View>
  );
}

function NewSeasonForm({
  groupId,
  list,
}: {
  groupId: string;
  list: SeasonList;
}) {
  const m = useMessages();
  const copy = m.mobileGroup.seasons.create;
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const [name, setName] = useState(() =>
    suggestedSeasonName(list.seasons, locale),
  );
  const [startsOn, setStartsOn] = useState(() =>
    suggestedSeasonStart(list.seasons, new Date()),
  );
  const [endsOn, setEndsOn] = useState(() => suggestedSeasonEnd(startsOn));
  const [submitted, setSubmitted] = useState(false);

  const createSeason = api.groups.createSeason.useMutation({
    onSuccess: async (season) => {
      toast.show(seasonCreatedToast(season, locale));
      await Promise.all([
        utils.groups.listSeasons.invalidate({ groupId }),
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.seasonStanding.invalidate(),
        utils.groups.mine.invalidate(),
        utils.users.home.invalidate(),
      ]);
      router.dismissTo(groupSeasonsPath(groupId));
    },
  });

  const dates = { startsOn, endsOn };
  const datesError = seasonDatesError(dates, list.seasons, locale);
  const trimmed = name.trim();
  const nameError =
    submitted && trimmed.length === 0 ? copy.nameRequired : undefined;
  const serverError = createSeason.error
    ? splitTrpcFormError(createSeason.error)
    : null;

  function submit() {
    setSubmitted(true);
    if (createSeason.isPending || !trimmed || datesError) {
      return;
    }
    createSeason.mutate({ groupId, name: trimmed, startsOn, endsOn });
  }

  return (
    <Screen
      footer={
        <View style={{ flex: 1 }}>
          <Button
            label={copy.submit(trimmed || copy.seasonWord)}
            size="lg"
            pending={createSeason.isPending}
            disabled={Boolean(datesError)}
            onPress={submit}
          />
        </View>
      }
    >
      <ScreenHeader
        nav="back"
        fallback={groupSeasonsPath(groupId)}
        title={copy.title}
      >
        {list.groupName ? (
          <Text size="meta" tone="muted" numberOfLines={1}>
            {list.groupName}
          </Text>
        ) : null}
      </ScreenHeader>
      <TextField
        label={copy.name}
        value={name}
        maxLength={SEASON_NAME_MAX_LENGTH}
        autoCapitalize="words"
        error={nameError ?? serverError?.fieldErrors.name}
        editable={!createSeason.isPending}
        onChangeText={setName}
      />
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", gap: 12 }}>
          <DayButton
            label={copy.starts}
            day={startsOn}
            onPick={(day) => {
              setStartsOn(day);
              if (endsOn < day) {
                setEndsOn(suggestedSeasonEnd(day));
              }
            }}
          />
          <DayButton label={copy.ends} day={endsOn} onPick={setEndsOn} />
        </View>
        <Text
          size="meta"
          weight={datesError ? "medium" : "regular"}
          tone={datesError ? "default" : "muted"}
          accessibilityLiveRegion="polite"
        >
          {newSeasonSummaryLine(dates, list.seasons, locale)}
        </Text>
      </View>
      {datesError ? null : (
        <Surface style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text
              size="h2"
              width="expanded"
              uppercase
              numberOfLines={2}
              style={{ flexShrink: 1 }}
            >
              {trimmed || suggestedSeasonName(list.seasons, locale)}
            </Text>
            <Text size="meta" tone="muted">
              {formatSeasonRange(dates, locale)}
            </Text>
          </View>
          <Text size="meta" tone="muted">
            {m.group.season.newStandingNote}
          </Text>
        </Surface>
      )}
      {serverError?.globalMessage ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {serverError.globalMessage}
        </Text>
      ) : null}
    </Screen>
  );
}

/** Opening a Season (web `/dashboard/groups/[id]/seasons/new`); owner only. */
export function NewSeasonScreen({ groupId }: { groupId: string }) {
  const m = useMessages();
  const seasons = api.groups.listSeasons.useQuery({ groupId });
  const header = (
    <ScreenHeader
      nav="back"
      fallback={groupPath(groupId)}
      title={m.mobileGroup.seasons.create.title}
    />
  );

  if (!seasons.data) {
    return (
      <Screen>
        {header}
        {seasons.error ? (
          <Notice
            alert
            title={m.mobileGroup.seasons.loadFailed}
            description={seasons.error.message}
            onRetry={() => void seasons.refetch()}
          />
        ) : (
          <>
            <Skeleton height={64} radius={12} />
            <Skeleton height={64} radius={12} />
            <Skeleton height={120} radius={16} />
          </>
        )}
      </Screen>
    );
  }

  if (!seasons.data.canManage) {
    return (
      <Screen>
        {header}
        <Notice title={m.mobileGroup.seasons.create.ownerOnly} />
      </Screen>
    );
  }

  return <NewSeasonForm groupId={groupId} list={seasons.data} />;
}

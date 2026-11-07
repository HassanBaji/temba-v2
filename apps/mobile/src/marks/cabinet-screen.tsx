import { colors, radii, sizes } from "@repo/design-tokens";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import type { CoinKind } from "@repo/domain/marks";
import type { Sport } from "@repo/domain/sport";
import { useLocalSearchParams, useRouter, useSegments } from "expo-router";
import { EyeOff } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { playerMarkPath, playerPath } from "../player-profile/player-path";
import { hairline } from "../primitives/hairline-width";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { SettingsGroup, SwitchRow } from "../profile-settings/settings-rows";
import { SectionHead } from "../profile/profile-parts";
import { api } from "../trpc/react";
import {
  cabinetScreenModel,
  cabinetTab,
  type CabinetKindRow,
  type CabinetMvpModel,
  type CabinetScreenModel,
  type ShownCabinet,
} from "./cabinet-model";
import { MarkCoin } from "./mark-coin";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const TAB_HEIGHT = 36;
const KIND_ROW_MIN_HEIGHT = 64;

function SportTabs({
  tabs,
  value,
  onSelect,
}: {
  tabs: CabinetScreenModel["tabs"];
  value: Sport;
  onSelect: (sport: Sport) => void;
}) {
  const m = useMessages();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={m.mobilePlayer.lib.sport}
      style={{
        flexDirection: "row",
        gap: 2,
        padding: 2,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: colors.rule,
      }}
    >
      {tabs.map((tab) => {
        const selected = tab.sport === value;
        return (
          <SurfaceToneContext.Provider
            key={tab.sport}
            value={selected ? "ink" : "paper"}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              hitSlop={(sizes.touchTarget - TAB_HEIGHT) / 2}
              onPress={() => onSelect(tab.sport)}
              style={{
                height: TAB_HEIGHT,
                paddingHorizontal: 12,
                justifyContent: "center",
                borderRadius: radii.sm,
                backgroundColor: selected ? colors.ink : colors.paper,
              }}
            >
              <Text
                size="meta"
                weight={selected ? "semibold" : "regular"}
                tone={selected ? "default" : "muted"}
              >
                {tab.label}
              </Text>
            </Pressable>
          </SurfaceToneContext.Provider>
        );
      })}
    </View>
  );
}

function MvpHero({
  mvp,
  onOpen,
}: {
  mvp: CabinetMvpModel;
  onOpen: () => void;
}) {
  const body = (
    <Surface
      tone={mvp.earned ? "ink" : "paper"}
      style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
    >
      <MarkCoin
        kind="mvp"
        size="sheet"
        state={mvp.earned ? "earned" : "notYet"}
      />
      <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          {mvp.count ? (
            <Text size="display" width="expanded" weight="bold" ltr>
              {mvp.count}
            </Text>
          ) : null}
          <Text weight="semibold">{mvp.name}</Text>
        </View>
        <Text size="eyebrow" tone="muted">
          {mvp.line}
        </Text>
      </View>
    </Surface>
  );
  if (!mvp.earned) {
    return (
      <View accessible accessibilityLabel={mvp.spoken}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={mvp.spoken}
      onPress={onOpen}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      {body}
    </Pressable>
  );
}

function KindRow({
  row,
  first,
  onOpen,
}: {
  row: CabinetKindRow;
  first: boolean;
  onOpen: (kind: CoinKind) => void;
}) {
  const palette = useTonePalette();
  const content = (
    <>
      <MarkCoin
        kind={row.kind}
        size="cabinet"
        state={row.earned ? "earned" : "notYet"}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          size="meta"
          weight="semibold"
          tone={row.earned ? "default" : "muted"}
          numberOfLines={1}
        >
          {row.name}
        </Text>
        <Text size="eyebrow" tone="muted">
          {row.sub}
        </Text>
      </View>
      {row.count ? (
        <Text size="figure" width="expanded" weight="bold" ltr>
          {row.count}
        </Text>
      ) : null}
    </>
  );
  const style = {
    minHeight: KIND_ROW_MIN_HEIGHT,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: first ? 0 : hairline,
    borderColor: palette.rule,
  };
  if (!row.earned) {
    return (
      <View accessible accessibilityLabel={row.spoken} style={style}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.spoken}
      onPress={() => onOpen(row.kind)}
      style={({ pressed }) => ({
        ...style,
        backgroundColor: pressed ? palette.wash : palette.background,
      })}
    >
      {content}
    </Pressable>
  );
}

function RoastsToggle({
  roasts,
}: {
  roasts: NonNullable<CabinetScreenModel["roasts"]>;
}) {
  const m = useMessages();
  const toast = useToast();
  const utils = api.useUtils();
  const [chosen, setChosen] = useState<boolean | null>(null);
  const save = api.users.setHideRoasts.useMutation({
    onError: () => {
      setChosen(null);
      toast.show(m.common.somethingWentWrong);
    },
    onSettled: () => utils.marks.cabinet.invalidate(),
  });
  return (
    <SettingsGroup>
      <SwitchRow
        icon={EyeOff}
        title={roasts.title}
        sub={roasts.help}
        value={chosen ?? roasts.hidden}
        disabled={save.isPending}
        onChange={(hide) => {
          setChosen(hide);
          save.mutate({ hide });
        }}
      />
    </SettingsGroup>
  );
}

function CabinetBody({
  model,
  onOpenKind,
}: {
  model: CabinetScreenModel;
  onOpenKind: (kind: CoinKind) => void;
}) {
  return (
    <>
      <View style={{ gap: 10 }}>
        <MvpHero mvp={model.mvp} onOpen={() => onOpenKind("mvp")} />
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            columnGap: 12,
          }}
        >
          <Text size="meta" tone="muted">
            {model.summary.received}
          </Text>
          <Text size="meta" tone="muted">
            {model.summary.notYet}
          </Text>
        </View>
      </View>
      {model.sections.map((section) => (
        <View key={section.group} style={{ gap: 12 }}>
          <SectionHead title={section.title} meta={section.meta} />
          <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
            {section.rows.map((row, index) => (
              <KindRow
                key={row.kind}
                row={row}
                first={index === 0}
                onOpen={onOpenKind}
              />
            ))}
          </Surface>
        </View>
      ))}
      {model.roasts ? <RoastsToggle roasts={model.roasts} /> : null}
    </>
  );
}

function useGamesPlayed(userId: string, sport: Sport, enabled: boolean) {
  const padel = api.users.playerProfile.useQuery(
    { userId },
    { enabled: enabled && sport === "padel" },
  );
  const football = api.users.footballProfile.useQuery(
    { userId },
    { enabled: enabled && sport === "football" },
  );
  const data = sport === "padel" ? padel.data : football.data;
  return data?.overall.played ?? null;
}

/** All marks (3a): one sport's tab of a Player's cabinet. */
export function CabinetScreen({
  userId,
  requestedSport,
}: {
  userId: string;
  requestedSport?: string;
}) {
  const router = useRouter();
  const segments = useSegments();
  const locale = useLocale();
  const m = useMessages();
  const [chosen, setChosen] = useState<Sport | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const query = api.marks.cabinet.useQuery({ userId }, REFETCH_ON_FOREGROUND);
  const cabinet: ShownCabinet | null =
    query.data && !query.data.hidden ? query.data : null;
  const sport = cabinet
    ? (chosen ?? cabinetTab(cabinet, requestedSport))
    : null;
  const gamesPlayed = useGamesPlayed(userId, sport ?? "padel", !!cabinet);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await query.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [query]);

  const fallback = playerPath(segments, userId);
  const title = m.marks.cabinet.title;

  if (query.data?.hidden || isNotFoundError(query.error)) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title={title} />
        <Notice
          title={m.mobileMarks.cabinet.unavailableTitle}
          description={m.mobileMarks.cabinet.unavailableDescription}
        />
      </Screen>
    );
  }

  if (query.error) {
    return (
      <Screen refreshing={refreshing} onRefresh={onRefresh}>
        <ScreenHeader nav="back" fallback={fallback} title={title} />
        <Notice
          alert
          title={m.mobileMarks.cabinet.loadError}
          description={query.error.message}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  if (!cabinet || !sport) {
    return (
      <Screen>
        <ScreenHeader nav="back" fallback={fallback} title={title} />
        <Skeleton height={100} radius={16} />
        <Skeleton height={260} radius={14} />
      </Screen>
    );
  }

  const model = cabinetScreenModel(cabinet, sport, gamesPlayed, locale);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <ScreenHeader
        nav="back"
        fallback={fallback}
        title={title}
        actions={
          model.tabs.length > 1 ? (
            <SportTabs tabs={model.tabs} value={sport} onSelect={setChosen} />
          ) : null
        }
      />
      <CabinetBody
        model={model}
        onOpenKind={(kind) =>
          router.push(playerMarkPath(segments, userId, kind, sport))
        }
      />
    </Screen>
  );
}

export function PlayerMarksRoute() {
  const { userId, sport } = useLocalSearchParams<{
    userId: string;
    sport?: string;
  }>();
  return <CabinetScreen userId={userId} requestedSport={sport} />;
}

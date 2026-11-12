import { radii, sizes } from "@repo/design-tokens";
import {
  rateGameDraft,
  rateGameSubmission,
  rateGameView,
  setDraftRating,
  toggleDraftMvp,
  type RateGameDraft,
  type RateGameRow,
  type RateGameSheet,
  type RateGameSide,
  type RateGameView,
} from "@repo/domain/performance-rating";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ChevronDown,
  ChevronUp,
  EyeOff,
  Lock,
  Star,
} from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { BibChip } from "../football/bib-picker";
import { gamePath } from "../games/games-model";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Hatch } from "../primitives/hatch";
import { InitialsTile } from "../primitives/initials-tile";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api, type RouterOutputs } from "../trpc/react";

type Sheet = RouterOutputs["games"]["performanceRatingSheet"];

const CELL_HEIGHT = 34;
const CELL_GAP = 3;
const STAR = 32;
const ICON = 15;

export function Hero({ hero }: { hero: RateGameView["hero"] }) {
  return (
    <Surface style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            gap: 7,
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          <Text size="eyebrow" weight="semibold">
            {hero.sport}
          </Text>
          {hero.groupName ? (
            <Text
              size="eyebrow"
              tone="muted"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {hero.groupName}
            </Text>
          ) : null}
        </View>
        <Text size="eyebrow" weight="semibold">
          {hero.status}
        </Text>
      </View>
      <View
        accessible
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <BibChip bib={hero.slot1.bib} />
          <Text weight="semibold">{hero.slot1.name}</Text>
        </View>
        {hero.score ? (
          <Text size="display" weight="bold" width="expanded">
            {hero.score}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <BibChip bib={hero.slot2.bib} />
          <Text>{hero.slot2.name}</Text>
        </View>
      </View>
      {hero.line ? (
        <Text size="eyebrow" tone="muted" style={{ textAlign: "center" }}>
          {hero.line}
        </Text>
      ) : null}
    </Surface>
  );
}

function PrivacyPanel({
  privacy,
}: {
  privacy: NonNullable<RateGameView["privacy"]>;
}) {
  const colors = useColors();
  return (
    <Surface
      accessible
      style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
    >
      <View
        style={{
          width: STAR,
          height: STAR,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          borderWidth: hairline,
          borderColor: colors.rule,
        }}
      >
        <EyeOff size={16} color={colors.ink} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" weight="semibold">
          {privacy.title}
        </Text>
        <Text size="eyebrow" tone="muted">
          {privacy.description}
        </Text>
      </View>
    </Surface>
  );
}

function Cells({
  row,
  disabled,
  onPick,
}: {
  row: RateGameRow;
  disabled: boolean;
  onPick: (value: number) => void;
}) {
  const colors = useColors();
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={row.spoken}
      style={{ flexDirection: "row", gap: CELL_GAP }}
    >
      {row.cells.map((cell) => {
        const selected = cell.state === "selected";
        const below = cell.state === "below";
        return (
          <Pressable
            key={cell.value}
            accessibilityRole="radio"
            accessibilityLabel={cell.spoken}
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            hitSlop={{ top: 5, bottom: 5 }}
            onPress={() => onPick(cell.value)}
            style={{
              flex: 1,
              height: CELL_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.sm,
              borderWidth: hairline,
              borderColor: selected ? colors.controlEdge : colors.rule,
              backgroundColor: selected
                ? colors.control
                : below
                  ? colors.wash
                  : colors.paper,
            }}
          >
            <Text
              size="eyebrow"
              tone={selected || below ? "default" : "muted"}
              style={selected ? { color: colors.onControl } : undefined}
            >
              {cell.value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function StarButton({
  star,
  disabled,
  onPress,
}: {
  star: NonNullable<RateGameRow["star"]>;
  disabled: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={star.spoken}
      accessibilityState={{ selected: star.on, disabled }}
      disabled={disabled}
      hitSlop={(sizes.touchTarget - STAR) / 2}
      onPress={onPress}
      style={{
        width: STAR,
        height: STAR,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: star.on ? colors.controlEdge : colors.rule,
        backgroundColor: star.on ? colors.control : colors.paper,
      }}
    >
      <Star size={ICON} color={star.on ? colors.onControl : colors.muted} />
    </Pressable>
  );
}

function PlayerRow({
  row,
  disabled,
  onPick,
  onStar,
}: {
  row: RateGameRow;
  disabled: boolean;
  onPick: (value: number) => void;
  onStar: () => void;
}) {
  return (
    <View style={{ gap: 10, paddingHorizontal: 16, paddingVertical: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <InitialsTile name={row.name} size="md" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold" numberOfLines={1}>
            {row.name}
          </Text>
          {row.detail ? (
            <Text size="eyebrow" tone="muted" numberOfLines={1}>
              {row.detail}
            </Text>
          ) : null}
        </View>
        <Text
          size="h2"
          weight="bold"
          width="expanded"
          tone={row.value === null ? "muted" : "default"}
          accessibilityElementsHidden
          importantForAccessibility="no"
          style={{ minWidth: 28, textAlign: "right" }}
        >
          {row.valueLabel}
        </Text>
        {row.star ? (
          <StarButton star={row.star} disabled={disabled} onPress={onStar} />
        ) : null}
      </View>
      <Cells row={row} disabled={disabled} onPick={onPick} />
    </View>
  );
}

function SelfRow({ self }: { self: NonNullable<RateGameSide["self"]> }) {
  const colors = useColors();
  return (
    <View
      accessible
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
        overflow: "hidden",
      }}
    >
      <Hatch bordered={false} radius={0} />
      <InitialsTile name={self.playerName} size="md" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">{self.name}</Text>
        <Text size="eyebrow" tone="muted">
          {self.note}
        </Text>
      </View>
      <Lock size={ICON} color={colors.muted} />
    </View>
  );
}

function SideBlock({
  side,
  open,
  disabled,
  onToggle,
  onPick,
  onStar,
}: {
  side: RateGameSide;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  onPick: (userId: string, value: number) => void;
  onStar: (userId: string) => void;
}) {
  const colors = useColors();
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? side.hideLabel : side.showLabel}
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 16,
          minHeight: sizes.touchTarget,
        }}
      >
        <BibChip bib={side.bib} />
        <Text size="meta" weight="semibold">
          {side.name}
        </Text>
        {!open ? (
          <Text size="meta" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
            {side.collapsedLine}
          </Text>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        {open && side.aside ? (
          <Text size="eyebrow" tone="muted">
            {side.aside}
          </Text>
        ) : null}
        <Chevron size={16} color={colors.ink} />
      </Pressable>
      {open
        ? side.rows.map((row) => (
            <View key={row.userId}>
              <Hairline />
              <PlayerRow
                row={row}
                disabled={disabled}
                onPick={(value) => onPick(row.userId, value)}
                onStar={() => onStar(row.userId)}
              />
            </View>
          ))
        : null}
      {open && side.self ? (
        <>
          <Hairline />
          <SelfRow self={side.self} />
        </>
      ) : null}
    </Surface>
  );
}

function RateGameForm({
  gameId,
  sheet,
  header,
}: {
  gameId: string;
  sheet: Sheet;
  header: React.ReactNode;
}) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const utils = api.useUtils();
  const input: RateGameSheet = sheet;
  const [draft, setDraft] = useState<RateGameDraft>(() => rateGameDraft(input));
  const view = rateGameView(input, draft, locale);
  const [open, setOpen] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(
      view.sides.map((side) => [side.slot, side.openByDefault]),
    ),
  );

  const setMvp = api.marks.setMvp.useMutation();
  const submit = api.games.submitPerformanceRatings.useMutation();
  const pending = setMvp.isPending || submit.isPending;

  async function send() {
    const payload = rateGameSubmission(draft, input);
    try {
      if (payload.mvpUserId) {
        await setMvp.mutateAsync({ gameId, userId: payload.mvpUserId });
      }
      await submit.mutateAsync({ gameId, ratings: payload.ratings });
    } catch (error) {
      toast.show(error instanceof Error ? error.message : m.common.tryAgain);
      return;
    }
    toast.show(view.submitted);
    await Promise.all([
      utils.games.performanceRatingSheet.invalidate({ gameId }),
      utils.games.performanceRatingResult.invalidate({ gameId }),
      utils.games.byId.invalidate({ id: gameId }),
      utils.games.footballBoard.invalidate({ gameId }),
      utils.marks.forGame.invalidate({ gameId }),
    ]);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(gamePath(gameId));
    }
  }

  return (
    <Screen
      footer={
        view.canSubmit ? (
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold">{view.footer.title}</Text>
              {view.footer.subline ? (
                <Text size="meta" tone="muted" numberOfLines={1}>
                  {view.footer.subline}
                </Text>
              ) : null}
            </View>
            <Button
              label={view.footer.submit}
              size="lg"
              pending={pending}
              disabled={pending}
              onPress={() => void send()}
            />
          </View>
        ) : undefined
      }
    >
      {header}
      <Hero hero={view.hero} />
      {view.privacy && !view.notice ? (
        <PrivacyPanel privacy={view.privacy} />
      ) : null}
      {view.notice ? (
        <Notice
          title={view.notice.title}
          description={view.notice.description}
        />
      ) : (
        <View style={{ gap: 10 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text size="title" weight="semibold" accessibilityRole="header">
              {view.heading}
            </Text>
            <Text size="meta" tone="muted">
              {view.headingAside}
            </Text>
          </View>
          {view.sides.map((side) => (
            <SideBlock
              key={side.slot}
              side={side}
              open={open[side.slot] ?? false}
              disabled={!view.canSubmit || pending}
              onToggle={() =>
                setOpen((current) => ({
                  ...current,
                  [side.slot]: !current[side.slot],
                }))
              }
              onPick={(userId, value) =>
                setDraft((current) => setDraftRating(current, userId, value))
              }
              onStar={(userId) =>
                setDraft((current) => toggleDraftMvp(current, input, userId))
              }
            />
          ))}
          <Text size="eyebrow" tone="muted">
            {view.footnote}
          </Text>
        </View>
      )}
    </Screen>
  );
}

/**
 * Rate the game. Screen 4a: in Organizer mode the Organizer scores every
 * player 1 to 10 and stars the MVP; Submit closes the Rating window and
 * everyone's Tier points move. Screen 4b: when everyone rates, a player
 * scores teammates and, if they want, opponents, and may change them until
 * the window closes.
 */
export function RateGameScreen({ gameId }: { gameId: string }) {
  const m = useMessages();
  const query = api.games.performanceRatingSheet.useQuery({ gameId });
  const header = (
    <ScreenHeader
      nav="back"
      fallback={gamePath(gameId)}
      title={m.rating.performance.title}
    />
  );

  if (!query.data) {
    return (
      <Screen>
        {header}
        {query.error ? (
          <Notice
            alert
            title={m.rating.performance.loadFailed}
            description={query.error.message}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <>
            <Skeleton height={140} radius={16} />
            <Skeleton height={320} radius={16} />
          </>
        )}
      </Screen>
    );
  }

  return (
    <RateGameForm
      key={`${query.data.matchId}:${query.data.state}`}
      gameId={gameId}
      sheet={query.data}
      header={header}
    />
  );
}

export function RateGameRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RateGameScreen gameId={id} />;
}

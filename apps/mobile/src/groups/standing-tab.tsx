import { radii, sizes, spacing } from "@repo/design-tokens";
import type {
  GroupHomeData,
  GroupStandingRowData,
} from "@repo/domain/group-data";
import {
  groupStandingEmptyFooter,
  groupStandingOpenSeats,
} from "@repo/domain/group-empty-states";
import { groupHasGames, groupStandingState } from "@repo/domain/group-join";
import {
  formatSeasonRange,
  seasonDisplayName,
  seasonGamesCountedLine,
  seasonLensChips,
  seasonLockedLine,
  seasonProgress,
  seasonProgressLine,
  seasonStartsLine,
  type GroupSeasonData,
  type GroupSeasonStatus,
} from "@repo/domain/group-season";
import {
  standingDiffUnit,
  standingLegend,
  standingRecordLabel,
  standingRulesLine,
  standingShowsDraws,
  standingTierFootnote,
  unrankedNote,
} from "@repo/domain/season-standing";
import {
  mostImprovedColumns,
  mostImprovedNoGainNote,
  mostImprovedSpoken,
  mostImprovedTable,
  standingByLevel,
  standingViewFooter,
  standingViewOptions,
  standingViewShown,
  type MostImprovedRow,
  type StandingLevelsData,
  type StandingView,
  type StandingViewOption,
} from "@repo/domain/standing-views";
import { isRtl } from "@repo/i18n/locale";
import { useRouter, type Href } from "expo-router";
import { Lock, Plus, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Hatch } from "../primitives/hatch";
import { hairline as hairlineWidth } from "../primitives/hairline-width";
import { ResultMark } from "../primitives/result-mark";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import {
  SurfaceToneContext,
  useTonePalette,
} from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import {
  standingRowView,
  standingStats,
  type StandingRowView,
} from "./group-home-model";
import { NicknameName } from "../primitives/nickname-name";
import { groupSeasonsPath } from "./groups-model";
import { Notice } from "./notice";

type Season = GroupSeasonData & { status: GroupSeasonStatus };

const POSITION_WIDTH = 30;
const COUNT_WIDTH = 24;
const POINTS_WIDTH = 36;
const SEAT_SIZE = 32;
const MARK_SIZE = 11;

function HeaderCell({
  label,
  width,
  strong = false,
  align = "center",
}: {
  label: string;
  width?: number;
  strong?: boolean;
  align?: "left" | "center" | "right";
}) {
  return (
    <Text
      size="eyebrow"
      tone={strong ? "default" : "muted"}
      weight={strong ? "semibold" : "regular"}
      mono
      style={{ width, flex: width ? undefined : 1, textAlign: align }}
    >
      {label}
    </Text>
  );
}

function FormStrip({ form }: { form: StandingRowView["form"] }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 3, marginTop: 3 }}
    >
      {form.map((mark, index) => (
        <ResultMark key={index} variant={mark} size={MARK_SIZE} decorative />
      ))}
    </View>
  );
}

function HatchedCell({ width, size = 12 }: { width: number; size?: number }) {
  return (
    <View style={{ width, alignItems: "center" }}>
      <View style={{ width: size, height: size }}>
        <Hatch radius={3} />
      </View>
    </View>
  );
}

function StandingRow({
  row,
  notPlayedYet,
  showDraws,
  levelLabel,
  onOpen,
}: {
  row: StandingRowView;
  notPlayedYet: boolean;
  showDraws: boolean;
  /** By level: the band or OVR beside the form strip. */
  levelLabel?: string | null;
  onOpen?: (userId: string) => void;
}) {
  const m = useMessages();
  const colors = useColors();
  const muted = notPlayedYet || !row.ranked;
  const count = (value: number) => (
    <Text
      size="body"
      tone="muted"
      style={{ width: COUNT_WIDTH, textAlign: "center" }}
    >
      {value}
    </Text>
  );
  const body = (
    <View
      accessible={onOpen == null}
      accessibilityLabel={onOpen ? undefined : row.accessibilityLabel}
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: spacing.surface,
        paddingVertical: 10,
        backgroundColor: row.isViewer ? colors.wash : undefined,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: POSITION_WIDTH }}
      >
        {row.ranked && !notPlayedYet ? (
          <Text size="lead" width="expanded" weight="bold">
            {row.position}
          </Text>
        ) : (
          <View style={{ width: 20, height: 20 }}>
            <Hatch radius={5} />
          </View>
        )}
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flex: 1, minWidth: 0 }}
      >
        <NicknameName
          name={row.name}
          isNickname={row.isNickname}
          weight={row.isViewer ? "semibold" : "regular"}
          tone={muted ? "muted" : "default"}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <FormStrip form={row.form} />
          {levelLabel ? (
            <Text size="eyebrow" tone="muted" style={{ marginTop: 3 }}>
              {levelLabel}
            </Text>
          ) : null}
        </View>
      </View>
      {notPlayedYet ? (
        <>
          <HatchedCell width={COUNT_WIDTH} />
          <HatchedCell width={COUNT_WIDTH} />
          {showDraws ? <HatchedCell width={COUNT_WIDTH} /> : null}
          <HatchedCell width={COUNT_WIDTH} />
          <HatchedCell width={POINTS_WIDTH} />
        </>
      ) : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          {count(row.played)}
          {count(row.wins)}
          {showDraws ? count(row.draws) : null}
          {count(row.losses)}
          <Text
            size="lead"
            width="expanded"
            weight="bold"
            tone={muted ? "muted" : "default"}
            style={{ width: POINTS_WIDTH, textAlign: "right" }}
          >
            {row.points}
          </Text>
        </View>
      )}
    </View>
  );

  if (!onOpen) {
    return body;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={row.accessibilityLabel}
      accessibilityHint={m.mobileGroup.opensPlayerProfile}
      onPress={() => onOpen(row.key)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

function RecordHeader({ showDraws }: { showDraws: boolean }) {
  const m = useMessages();
  const colors = useColors();
  const columns = m.mobileGroup.standing.columns;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: spacing.surface,
        paddingVertical: 10,
        backgroundColor: colors.wash,
      }}
    >
      <View style={{ width: POSITION_WIDTH }} />
      <HeaderCell label={columns.player} align="left" />
      <HeaderCell label={columns.played} width={COUNT_WIDTH} />
      <HeaderCell label={columns.wins} width={COUNT_WIDTH} />
      {showDraws ? (
        <HeaderCell label={columns.draws} width={COUNT_WIDTH} />
      ) : null}
      <HeaderCell label={columns.losses} width={COUNT_WIDTH} />
      <HeaderCell
        label={columns.points}
        width={POINTS_WIDTH}
        strong
        align="right"
      />
    </View>
  );
}

/** A section heading inside a table: Unranked, a category, No gain. */
function TableDivider({ label, note }: { label: string; note: string }) {
  const colors = useColors();
  return (
    <>
      <Hairline />
      <View
        accessibilityRole="header"
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 12,
          paddingHorizontal: spacing.surface,
          paddingVertical: 6,
          backgroundColor: colors.wash,
        }}
      >
        <Text size="eyebrow" tone="muted" mono uppercase>
          {label}
        </Text>
        <Text size="eyebrow" tone="muted">
          {note}
        </Text>
      </View>
    </>
  );
}

function TableFooter({ legend, footer }: { legend?: string; footer: string }) {
  return (
    <>
      <Hairline />
      <View style={{ padding: spacing.surface, gap: 6 }}>
        {legend ? <Text size="meta">{legend}</Text> : null}
        <Text size="meta" tone="muted">
          {footer}
        </Text>
      </View>
    </>
  );
}

function StandingTable({
  rows,
  notPlayedYet,
  showDraws,
  legend,
  footer,
  onOpenMember,
}: {
  rows: StandingRowView[];
  notPlayedYet: boolean;
  showDraws: boolean;
  legend: string;
  footer: string;
  onOpenMember?: (userId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const ranked = notPlayedYet ? rows : rows.filter((row) => row.ranked);
  const unranked = notPlayedYet ? [] : rows.filter((row) => !row.ranked);
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <RecordHeader showDraws={showDraws} />
      {ranked.map((row) => (
        <View key={row.key}>
          <Hairline />
          <StandingRow
            row={row}
            notPlayedYet={notPlayedYet}
            showDraws={showDraws}
            onOpen={onOpenMember}
          />
        </View>
      ))}
      {unranked.length > 0 ? (
        <TableDivider
          label={m.mobileGroup.standing.unranked}
          note={unrankedNote(locale)}
        />
      ) : null}
      {unranked.map((row) => (
        <View key={row.key}>
          <Hairline />
          <StandingRow
            row={row}
            notPlayedYet={false}
            showDraws={showDraws}
            onOpen={onOpenMember}
          />
        </View>
      ))}
      <TableFooter legend={legend} footer={footer} />
    </Surface>
  );
}

const VIEW_CHIP_HEIGHT = 34;

/** Design 1a: Overall, By level, Most improved, under the Season chips. */
function ViewChips({
  options,
  shown,
  onPick,
}: {
  options: StandingViewOption[];
  shown: StandingView;
  onPick: (view: StandingView) => void;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={m.group.standing.views.label}
      style={{ flexDirection: "row", gap: 8 }}
    >
      {options.map((option) => {
        const selected = option.view === shown;
        return (
          <SurfaceToneContext.Provider
            key={option.view}
            value={selected ? "ink" : "paper"}
          >
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected, disabled: !option.enabled }}
              accessibilityHint={
                option.enabled
                  ? undefined
                  : m.group.standing.views.mostImprovedSeasonOnly
              }
              disabled={!option.enabled}
              hitSlop={{
                top: (sizes.touchTarget - VIEW_CHIP_HEIGHT) / 2,
                bottom: (sizes.touchTarget - VIEW_CHIP_HEIGHT) / 2,
              }}
              onPress={() => onPick(option.view)}
              style={({ pressed }) => ({
                flex: 1,
                height: VIEW_CHIP_HEIGHT,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 8,
                borderRadius: radii.md,
                borderWidth: hairlineWidth,
                borderColor: selected ? colors.ink : colors.rule,
                backgroundColor: selected
                  ? colors.control
                  : pressed
                    ? colors.wash
                    : colors.paper,
              })}
            >
              <Text
                size="meta"
                weight={selected ? "semibold" : "regular"}
                tone={option.enabled ? "default" : "muted"}
                numberOfLines={1}
              >
                {option.label}
              </Text>
            </Pressable>
          </SurfaceToneContext.Provider>
        );
      })}
    </View>
  );
}

/** Design 1b, 1d, 1e: the Overall points, one table per Level category. */
function ByLevelTable({
  entries,
  levels,
  notPlayedYet,
  showDraws,
  legend,
  onOpenMember,
}: {
  entries: GroupStandingRowData[];
  levels: StandingLevelsData;
  notPlayedYet: boolean;
  showDraws: boolean;
  legend: string;
  onOpenMember?: (userId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const { sections, unranked } = standingByLevel(
    entries,
    levels.members,
    levels.sport,
    locale,
  );
  const row = (entry: (typeof unranked)[number]) => (
    <View key={entry.userId}>
      <Hairline />
      <StandingRow
        row={standingRowView(entry, locale)}
        notPlayedYet={notPlayedYet}
        showDraws={showDraws}
        levelLabel={entry.levelLabel}
        onOpen={onOpenMember}
      />
    </View>
  );
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <RecordHeader showDraws={showDraws} />
      {sections.map((section) => (
        <View key={section.key}>
          <TableDivider label={section.title} note={section.countLabel} />
          {section.rows.map(row)}
        </View>
      ))}
      {unranked.length > 0 ? (
        <TableDivider
          label={m.mobileGroup.standing.unranked}
          note={unrankedNote(locale)}
        />
      ) : null}
      {unranked.map(row)}
      <TableFooter
        legend={legend}
        footer={standingViewFooter(
          "by-level",
          { ladder: "level", sport: levels.sport },
          locale,
        )}
      />
    </Surface>
  );
}

const GAIN_VALUE_WIDTH = 46;
const GAIN_WIDTH = 62;

function MostImprovedLine({
  row,
  onOpen,
}: {
  row: MostImprovedRow<GroupStandingRowData>;
  onOpen?: (userId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  const view = standingRowView(row, locale);
  const label = mostImprovedSpoken(row, view.name, locale);
  const muted = row.position == null;
  const value = (text: string | null, strong = false) =>
    text == null ? (
      <HatchedCell width={strong ? GAIN_WIDTH : GAIN_VALUE_WIDTH} />
    ) : (
      <Text
        size={strong ? "lead" : "body"}
        width={strong ? "expanded" : undefined}
        weight={strong ? "bold" : "regular"}
        tone={strong && !muted ? "default" : "muted"}
        style={{
          width: strong ? GAIN_WIDTH : GAIN_VALUE_WIDTH,
          textAlign: "right",
        }}
      >
        {text}
      </Text>
    );
  const body = (
    <View
      accessible={onOpen == null}
      accessibilityLabel={onOpen ? undefined : label}
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: spacing.surface,
        paddingVertical: 10,
        backgroundColor: row.isViewer ? colors.wash : undefined,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: POSITION_WIDTH }}
      >
        {row.position != null ? (
          <Text size="lead" width="expanded" weight="bold">
            {row.position}
          </Text>
        ) : (
          <View style={{ width: 20, height: 20 }}>
            <Hatch radius={5} />
          </View>
        )}
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flex: 1, minWidth: 0 }}
      >
        <NicknameName
          name={view.name}
          isNickname={view.isNickname}
          weight={row.isViewer ? "semibold" : "regular"}
          tone={muted ? "muted" : "default"}
        />
        {row.changeLine ? (
          <Text size="eyebrow" tone="muted" style={{ marginTop: 2 }}>
            {row.changeLine}
          </Text>
        ) : null}
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        {value(row.start)}
        {value(row.end)}
        {value(row.gain, true)}
      </View>
    </View>
  );
  if (!onOpen) {
    return body;
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={m.mobileGroup.opensPlayerProfile}
      onPress={() => onOpen(row.userId)}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      {body}
    </Pressable>
  );
}

/** Design 1c: ranked by level gained since the Season opened. */
function MostImprovedTable({
  entries,
  levels,
  status,
  onOpenMember,
}: {
  entries: GroupStandingRowData[];
  levels: StandingLevelsData & {
    ladder: NonNullable<StandingLevelsData["ladder"]>;
  };
  status: GroupSeasonStatus;
  onOpenMember?: (userId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  const { ranked, noGain, unranked } = mostImprovedTable(
    entries,
    levels.members,
    levels.ladder,
    levels.sport,
    locale,
  );
  const columns = mostImprovedColumns(status, locale);
  const line = (row: MostImprovedRow<GroupStandingRowData>) => (
    <View key={row.userId}>
      <Hairline />
      <MostImprovedLine row={row} onOpen={onOpenMember} />
    </View>
  );
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: spacing.surface,
          paddingVertical: 10,
          backgroundColor: colors.wash,
        }}
      >
        <View style={{ width: POSITION_WIDTH }} />
        <HeaderCell
          label={m.mobileGroup.standing.columns.player}
          align="left"
        />
        <HeaderCell
          label={columns.start}
          width={GAIN_VALUE_WIDTH}
          align="right"
        />
        <HeaderCell
          label={columns.end}
          width={GAIN_VALUE_WIDTH}
          align="right"
        />
        <HeaderCell
          label={columns.gain}
          width={GAIN_WIDTH}
          strong
          align="right"
        />
      </View>
      {ranked.map(line)}
      {noGain.length > 0 ? (
        <TableDivider
          label={m.group.standing.views.noGain}
          note={mostImprovedNoGainNote(levels.ladder, locale)}
        />
      ) : null}
      {noGain.map(line)}
      {unranked.length > 0 ? (
        <TableDivider
          label={m.mobileGroup.standing.unranked}
          note={unrankedNote(locale)}
        />
      ) : null}
      {unranked.map(line)}
      <TableFooter
        footer={standingViewFooter(
          "most-improved",
          { ladder: levels.ladder, sport: levels.sport },
          locale,
        )}
      />
    </Surface>
  );
}

function Podium({ rows, season }: { rows: StandingRowView[]; season: Season }) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  const palette = useTonePalette();
  const top = rows.filter((row) => row.ranked).slice(0, 3);
  if (top.length === 0) {
    return null;
  }
  return (
    <View
      accessibilityLabel={m.mobileGroup.standing.podium}
      style={{
        borderWidth: 1.5,
        borderColor: colors.ink,
        borderRadius: radii.card,
        overflow: "hidden",
      }}
    >
      {top.map((row, index) => (
        <View key={row.key}>
          {index > 0 ? <Hairline /> : null}
          <View
            accessible
            accessibilityLabel={row.accessibilityLabel}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: spacing.surface,
              paddingVertical: 10,
              backgroundColor: row.isViewer ? colors.wash : undefined,
            }}
          >
            <Text
              size="h1"
              width="expanded"
              weight="bold"
              style={{ width: 32 }}
            >
              {row.position}
            </Text>
            <NicknameName
              name={row.name}
              isNickname={row.isNickname}
              weight={row.isViewer ? "semibold" : "regular"}
              style={{ flex: 1 }}
            />
            <Text size="meta" tone="muted">
              {standingRecordLabel(row)}
            </Text>
            <Text size="lead" width="expanded" weight="bold">
              {row.points}
              <Text size="eyebrow" tone="muted">
                {m.mobileGroup.standing.pointsSuffix}
              </Text>
            </Text>
          </View>
        </View>
      ))}
      <Hairline />
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.surface,
          paddingVertical: 8,
        }}
      >
        <Text size="eyebrow" tone="muted">
          {seasonLockedLine(season, locale)}
        </Text>
        <Lock size={14} color={palette.muted} />
      </View>
    </View>
  );
}

function SeasonHeader({
  season,
  gamesCounted,
  now,
}: {
  season: Season;
  gamesCounted: number;
  now: Date;
}) {
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  const name = seasonDisplayName(season.name, locale);
  const uppercase = !isRtl(locale);
  if (season.status === "upcoming") {
    return (
      <Surface tone="ink" radius="card">
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text
            size="display"
            width="expanded"
            weight="bold"
            uppercase={uppercase}
          >
            {name}
          </Text>
          <Text size="meta" tone="muted">
            {formatSeasonRange(season, locale)}
          </Text>
        </View>
        <Text style={{ marginTop: 8 }}>{seasonStartsLine(season, locale)}</Text>
      </Surface>
    );
  }

  if (season.status === "closed") {
    return (
      <Surface radius="card">
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text
            size="display"
            width="expanded"
            weight="bold"
            uppercase={uppercase}
          >
            {name}
          </Text>
          <Text size="meta" tone="muted">
            {formatSeasonRange(season, locale)}
          </Text>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
          }}
        >
          <View
            style={{
              borderWidth: hairlineWidth,
              borderColor: colors.ink,
              borderRadius: 4,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text size="eyebrow" weight="semibold" mono uppercase>
              {m.mobileGroup.standing.final}
            </Text>
          </View>
          <Text size="eyebrow" tone="muted">
            {seasonGamesCountedLine(gamesCounted, locale)}
          </Text>
        </View>
      </Surface>
    );
  }

  const progress = Math.round(seasonProgress(season, now) * 100);
  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Text
          size="display"
          width="expanded"
          weight="bold"
          uppercase={uppercase}
        >
          {name}
        </Text>
        <Text size="meta" tone="muted">
          {formatSeasonRange(season, locale)}
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={m.mobileGroup.standing.seasonProgress}
        accessibilityValue={{ min: 0, max: 100, now: progress }}
        style={{
          height: 3,
          marginTop: 12,
          borderRadius: 2,
          backgroundColor: colors.rule,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${progress}%`,
            height: "100%",
            backgroundColor: colors.ink,
          }}
        />
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 8,
        }}
      >
        <Text size="eyebrow" tone="muted">
          {seasonProgressLine(season, now, locale)}
        </Text>
        <Text size="eyebrow" tone="muted">
          {seasonGamesCountedLine(gamesCounted, locale)}
        </Text>
      </View>
    </View>
  );
}

function LensChips({
  seasons,
  lensId,
  now,
  onPick,
}: {
  seasons: Season[];
  lensId: string | null;
  now: Date;
  onPick: (seasonId: string | null) => void;
}) {
  const locale = useLocale();
  const colors = useColors();
  return (
    <View
      style={{
        borderBottomWidth: hairlineWidth,
        borderBottomColor: colors.rule,
      }}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 4 }}
      >
        {seasonLensChips(seasons, now, locale).map((chip) => {
          const selected = chip.seasonId === lensId;
          return (
            <Pressable
              key={chip.seasonId ?? "all-time"}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => onPick(chip.seasonId)}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 10,
                marginBottom: -hairlineWidth,
                borderBottomWidth: 2,
                borderBottomColor: selected ? colors.ink : "transparent",
              }}
            >
              <Text
                weight={selected ? "semibold" : "regular"}
                tone={selected ? "default" : "muted"}
              >
                {chip.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function OpenSeatRow({
  position,
  onInvite,
}: {
  position: number;
  onInvite?: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <View
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingStart: spacing.surface,
        paddingEnd: onInvite ? 10 : spacing.surface,
        paddingVertical: 10,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: POSITION_WIDTH }}
      >
        <Text size="lead" width="expanded" weight="bold" tone="muted">
          {position}
        </Text>
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <View style={{ width: SEAT_SIZE, height: SEAT_SIZE }}>
          <Hatch radius={radii.sm} />
        </View>
        <Text tone="muted">{m.mobileGroup.standing.openSeat}</Text>
      </View>
      {onInvite ? (
        <Button
          label={m.mobileGroup.standing.invite}
          accessibilityLabel={m.group.settings.menu.invite}
          size="sm"
          variant="outline"
          icon={<Plus size={sizes.iconAction} color={colors.ink} />}
          onPress={onInvite}
        />
      ) : null}
    </View>
  );
}

/**
 * Design "Group empty states" 01: before the first result the Standing draws
 * every member at 0 points and pads to four rows with open seats to invite into.
 */
function StandingPreview({
  data,
  apiOrigin,
  onOpenMember,
  onInvite,
}: {
  data: GroupHomeData;
  apiOrigin: string;
  onOpenMember?: (userId: string) => void;
  onInvite?: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const columns = m.mobileGroup.standing.columns;
  const leaderboard = data.standing.leaderboard;
  return (
    <Surface padded={false} style={{ overflow: "hidden" }}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          flexDirection: "row",
          gap: 8,
          paddingHorizontal: spacing.surface,
          paddingVertical: 12,
        }}
      >
        <HeaderCell
          label={columns.position}
          width={POSITION_WIDTH}
          align="left"
        />
        <HeaderCell label={columns.player} align="left" />
        <HeaderCell label={columns.points} width={POINTS_WIDTH} align="right" />
      </View>
      {leaderboard.map((entry, index) => {
        const row = standingRowView(entry, locale);
        const body = (
          <View
            accessible={onOpenMember == null}
            accessibilityLabel={row.accessibilityLabel}
            style={{
              minHeight: 56,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: spacing.surface,
              paddingVertical: 12,
            }}
          >
            <View style={{ width: POSITION_WIDTH }}>
              <Text size="lead" width="expanded" weight="bold">
                {index + 1}
              </Text>
            </View>
            <Avatar
              name={entry.name ?? m.mobileGroup.unnamedMember}
              uri={mediaUrl(entry.image, apiOrigin)}
              radius={radii.sm}
            />
            <NicknameName
              name={row.name}
              isNickname={row.isNickname}
              weight={row.isViewer ? "semibold" : "regular"}
              style={{ flex: 1 }}
            />
            <Text
              width="expanded"
              weight="bold"
              style={{ width: POINTS_WIDTH, textAlign: "right" }}
            >
              {row.points}
            </Text>
          </View>
        );
        return (
          <View key={entry.userId}>
            <Hairline />
            {row.isViewer ? (
              <Surface tone="ink" padded={false} radius="md">
                {body}
              </Surface>
            ) : onOpenMember ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={row.accessibilityLabel}
                onPress={() => onOpenMember(entry.userId)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                {body}
              </Pressable>
            ) : (
              body
            )}
          </View>
        );
      })}
      {groupStandingOpenSeats(leaderboard.length).map((position) => (
        <View key={position}>
          <Hairline />
          <OpenSeatRow position={position} onInvite={onInvite} />
        </View>
      ))}
      <Hairline />
      <View style={{ padding: spacing.surface }}>
        <Text size="meta" tone="muted">
          {groupStandingEmptyFooter(leaderboard.length, locale)}
        </Text>
      </View>
    </Surface>
  );
}

function StatCell({
  value,
  label,
  divided,
  muted,
}: {
  value: number;
  label: string;
  divided: boolean;
  muted: boolean;
}) {
  const m = useMessages();
  const palette = useTonePalette();
  return (
    <View
      accessible
      accessibilityLabel={m.mobileGroup.standing.statLabel(value, label)}
      style={{
        flex: 1,
        padding: spacing.surface,
        gap: 2,
        borderStartWidth: divided ? hairlineWidth : 0,
        borderStartColor: palette.rule,
      }}
    >
      <Text
        size="figure"
        width="expanded"
        weight="bold"
        tone={muted ? "muted" : "default"}
      >
        {value}
      </Text>
      <Text size="eyebrow" tone="muted" mono uppercase>
        {label}
      </Text>
    </View>
  );
}

function StatPair({
  data,
  muted = false,
}: {
  data: GroupHomeData;
  muted?: boolean;
}) {
  const locale = useLocale();
  return (
    <Surface padded={false} style={{ flexDirection: "row" }}>
      {standingStats(data, locale).map((stat, index) => (
        <StatCell
          key={stat.label}
          {...stat}
          divided={index > 0}
          muted={muted}
        />
      ))}
    </Surface>
  );
}

function TableSkeleton() {
  return (
    <Surface padded={false} style={{ padding: spacing.surface, gap: 8 }}>
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} height={44} />
      ))}
    </Surface>
  );
}

function TierFootnote({
  hasTier,
  seasonInView,
  ratingSettingsLine,
  onOpenMembers,
}: {
  hasTier: boolean;
  seasonInView: boolean;
  ratingSettingsLine: string | null;
  onOpenMembers?: () => void;
}) {
  const locale = useLocale();
  const footnote = standingTierFootnote({ hasTier, seasonInView }, locale);
  if (!footnote) {
    return null;
  }
  return (
    <View style={{ gap: 6, paddingHorizontal: spacing.surface }}>
      <Text size="meta" tone="muted">
        {footnote.before}
        <Text
          size="meta"
          accessibilityRole="link"
          onPress={onOpenMembers}
          style={{ textDecorationLine: "underline" }}
        >
          {footnote.membersLink}
        </Text>
        {footnote.after}
      </Text>
      {ratingSettingsLine ? (
        <Text size="meta" tone="muted">
          {ratingSettingsLine}
        </Text>
      ) : null}
    </View>
  );
}

export function StandingTab({
  data,
  apiOrigin,
  onOpenMember,
  onOpenMembers,
  onInvite,
  createGameHref,
}: {
  data: GroupHomeData;
  apiOrigin: string;
  onOpenMember?: (userId: string) => void;
  /** Switches to the Members tab, where the Group Tier lives. */
  onOpenMembers?: () => void;
  onInvite?: () => void;
  createGameHref?: Href;
}) {
  const router = useRouter();
  const locale = useLocale();
  const m = useMessages();
  const colors = useColors();
  const now = new Date();
  const seasons = data.seasons;
  const defaultLens = data.standing.seasonId;
  const [lensId, setLensId] = useState<string | null>(defaultLens);
  const lensIsDefault = lensId === defaultLens;
  const isMember = data.membership != null;
  const lens = api.groups.seasonStanding.useQuery(
    { groupId: data.id, seasonId: lensId },
    { enabled: isMember && !lensIsDefault },
  );
  const entries: GroupStandingRowData[] = lensIsDefault
    ? data.standing.leaderboard
    : (lens.data?.rows ?? []);
  const rows = entries.map((entry) => standingRowView(entry, locale));
  const counted = lensIsDefault
    ? data.standing.gamesCounted
    : (lens.data?.gamesCounted ?? 0);
  const season = seasons.find((row) => row.id === lensId) ?? null;
  const [pickedView, setPickedView] = useState<StandingView>("overall");
  const viewOptions = standingViewOptions(
    {
      verified: data.verified,
      hasTier: data.hasTier ?? false,
      hasSeasons: seasons.length > 0,
      seasonInView: season != null,
    },
    locale,
  );
  const view = standingViewShown(pickedView, viewOptions);
  const levels = api.groups.standingLevels.useQuery(
    { groupId: data.id, seasonId: lensId },
    { enabled: isMember && view !== "overall" },
  );
  const footer = standingRulesLine(standingDiffUnit(data.sport), locale);
  const showDraws = standingShowsDraws(data.sport, rows);

  const state = groupStandingState({
    isMember,
    hasGames: groupHasGames(data),
    leaderboard: data.standing.leaderboard,
  });
  if (state.kind === "not-member") {
    return <Notice {...m.mobileGroup.standing.notMember} />;
  }
  const manageSeasons = data.canManageSeasons ? (
    <Button
      label={
        seasons.length > 0
          ? m.mobileGroup.seasons.manage
          : m.mobileGroup.seasons.setUp
      }
      variant="outline"
      onPress={() => router.push(groupSeasonsPath(data.id))}
    />
  ) : null;
  if (seasons.length === 0 && state.showNoResultsNotice && state.showTable) {
    const firstGameHref = state.showCreateFirstGame
      ? createGameHref
      : undefined;
    return (
      <View style={{ gap: spacing.compact }}>
        <StandingPreview
          data={data}
          apiOrigin={apiOrigin}
          onOpenMember={onOpenMember}
          onInvite={onInvite}
        />
        {onInvite || firstGameHref ? (
          <View style={{ gap: 8 }}>
            {onInvite ? (
              <Button
                label={m.group.settings.menu.invite}
                size="lg"
                icon={
                  <UserPlus size={sizes.iconAction} color={colors.onControl} />
                }
                onPress={onInvite}
              />
            ) : null}
            {firstGameHref ? (
              <Button
                label={m.mobileGroup.standing.createFirstGame}
                size="lg"
                variant={onInvite ? "outline" : "default"}
                onPress={() => router.push(firstGameHref)}
              />
            ) : null}
          </View>
        ) : null}
        <StatPair data={data} muted />
        {manageSeasons}
      </View>
    );
  }

  const levelData = levels.data;
  let table: React.ReactNode;
  if (
    (!lensIsDefault && lens.isLoading) ||
    (view !== "overall" && levels.isLoading)
  ) {
    table = <TableSkeleton />;
  } else if (!lensIsDefault && lens.error) {
    table = (
      <Notice
        title={m.mobileGroup.loadFailed.standing}
        description={lens.error.message}
      />
    );
  } else if (view !== "overall" && levels.error) {
    table = (
      <Notice
        title={m.mobileGroup.loadFailed.standing}
        description={levels.error.message}
      />
    );
  } else if (rows.length === 0) {
    table = <Notice title={m.mobileGroup.standing.noResultsTitle} />;
  } else if (view === "by-level" && levelData) {
    table = (
      <ByLevelTable
        entries={entries}
        levels={levelData}
        notPlayedYet={counted === 0}
        showDraws={showDraws}
        legend={standingLegend(showDraws, locale)}
        onOpenMember={onOpenMember}
      />
    );
  } else if (view === "most-improved" && levelData?.ladder && season) {
    table = (
      <MostImprovedTable
        entries={entries}
        levels={{ ...levelData, ladder: levelData.ladder }}
        status={season.status}
        onOpenMember={onOpenMember}
      />
    );
  } else {
    table = (
      <StandingTable
        rows={rows}
        notPlayedYet={counted === 0}
        showDraws={showDraws}
        legend={standingLegend(showDraws, locale)}
        footer={footer}
        onOpenMember={onOpenMember}
      />
    );
  }

  return (
    <View style={{ gap: spacing.compact }}>
      {season ? (
        <SeasonHeader season={season} gamesCounted={counted} now={now} />
      ) : null}
      {seasons.length > 0 ? (
        <LensChips
          seasons={seasons}
          lensId={lensId}
          now={now}
          onPick={setLensId}
        />
      ) : null}
      {viewOptions.length > 0 ? (
        <ViewChips options={viewOptions} shown={view} onPick={setPickedView} />
      ) : null}
      {view === "overall" && season?.status === "closed" && !lens.isLoading ? (
        <Podium rows={rows} season={season} />
      ) : null}
      {table}
      <TierFootnote
        hasTier={data.hasTier ?? false}
        seasonInView={season != null}
        ratingSettingsLine={data.ratingSettingsLine ?? null}
        onOpenMembers={onOpenMembers}
      />
      {seasons.length === 0 ? <StatPair data={data} /> : null}
      {manageSeasons}
    </View>
  );
}

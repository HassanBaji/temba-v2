import { radii, spacing } from "@repo/design-tokens";
import {
  challengeBoardFilterGroups,
  challengeBoardHasFilters,
  challengeCardView,
  type ChallengeBoardFilterKey,
  type ChallengeBoardFilters,
} from "@repo/domain/challenge-card";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { ChipGrid, ChoiceChip } from "../create-game/chips";
import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import { ChallengeCard } from "./challenge-card";
import { challengeCardInput, type OpenChallenge } from "./challenges-model";
import { SegmentEmpty } from "./segment-empty";

const FILTER_HEIGHT = 40;
const FILTER_MIN_WIDTH = 72;

export type OpenSegmentProps = {
  board: Slot<{ challenges: OpenChallenge[]; areas: string[] }>;
  filters: ChallengeBoardFilters;
  onFilter: (key: ChallengeBoardFilterKey, value: string | null) => void;
  onClearFilters: () => void;
  onOpenChallenge: (challengeId: string) => void;
  onAcceptChallenge: (challengeId: string) => void;
  onPost: () => void;
  onGoToTeams: () => void;
  onRetry: () => void;
};

/** A labelled box: "Sport" over "All". */
function FilterBox({
  label,
  value,
  accessibilityLabel,
  active,
  onPress,
}: {
  label: string;
  value: string;
  accessibilityLabel: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={2}
      style={({ pressed }) => ({
        height: FILTER_HEIGHT,
        minWidth: FILTER_MIN_WIDTH,
        paddingHorizontal: 12,
        justifyContent: "center",
        gap: 1,
        borderRadius: radii.md,
        borderWidth: hairline,
        borderColor: active ? colors.ink : colors.rule,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text size="eyebrow" tone="muted" style={{ lineHeight: 13 }}>
        {label}
      </Text>
      <Text size="meta" weight="semibold" numberOfLines={1}>
        {value}
      </Text>
    </Pressable>
  );
}

/** Sport, Level, Area and Day in one scrolling row; each opens a sheet of choices. */
function FilterRow({
  filters,
  areas,
  onFilter,
  onClearFilters,
}: Pick<OpenSegmentProps, "filters" | "onFilter" | "onClearFilters"> & {
  areas: readonly string[];
}) {
  const m = useMessages();
  const locale = useLocale();
  const [openKey, setOpenKey] = useState<ChallengeBoardFilterKey | null>(null);
  const groups = challengeBoardFilterGroups(filters, areas, locale);
  const open = groups.find((group) => group.key === openKey) ?? null;
  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        accessibilityLabel={m.challenge.filters.label}
        style={{ marginHorizontal: -spacing.surface }}
        contentContainerStyle={{
          gap: 6,
          paddingHorizontal: spacing.surface,
        }}
      >
        {groups.map((group) => (
          <FilterBox
            key={group.key}
            label={group.label}
            value={group.summary}
            accessibilityLabel={m.challenge.filters.chip(
              group.label,
              group.summary,
            )}
            active={filters[group.key] != null}
            onPress={() => setOpenKey(group.key)}
          />
        ))}
        {challengeBoardHasFilters(filters) ? (
          <ChoiceChip
            label={m.challenge.filters.clear}
            dashed
            onPress={onClearFilters}
          />
        ) : null}
      </ScrollView>
      <Sheet
        visible={open != null}
        onClose={() => setOpenKey(null)}
        title={open?.label}
      >
        {open ? (
          <ChipGrid
            label={open.label}
            chips={open.options.map((option) => ({
              value: option.value ?? "",
              label: option.label,
            }))}
            isSelected={(value) =>
              (open.options.find((option) => option.selected)?.value ?? "") ===
              value
            }
            onSelect={(value) => {
              onFilter(open.key, value === "" ? null : value);
              setOpenKey(null);
            }}
          />
        ) : null}
      </Sheet>
    </>
  );
}

/** 1a: the Open feed under its filters, with the footnote on hatched seats. */
export function OpenSegment(props: OpenSegmentProps) {
  const m = useMessages();
  const locale = useLocale();
  const now = new Date();
  const { board } = props;
  if (board.status === "loading") {
    return (
      <View style={{ gap: 12 }}>
        {[0, 1].map((key) => (
          <Skeleton key={key} height={220} radius={radii.surface} />
        ))}
      </View>
    );
  }
  if (board.status === "error") {
    return (
      <Notice
        alert
        title={m.challenge.open.errorTitle}
        description={board.message}
        onRetry={props.onRetry}
      />
    );
  }
  const filtered = challengeBoardHasFilters(props.filters);
  if (board.value.challenges.length === 0 && !filtered) {
    return <SegmentEmpty segment="open" onGoToTeams={props.onGoToTeams} />;
  }
  return (
    <View style={{ gap: 16 }}>
      <FilterRow
        filters={props.filters}
        areas={board.value.areas}
        onFilter={props.onFilter}
        onClearFilters={props.onClearFilters}
      />
      {board.value.challenges.length === 0 ? (
        <Surface style={{ gap: 4, padding: spacing.compact }}>
          <Text weight="semibold">{m.challenge.open.filteredEmptyTitle}</Text>
          <Text size="meta" tone="muted">
            {m.challenge.open.filteredEmptyCopy}
          </Text>
        </Surface>
      ) : (
        <View style={{ gap: 10 }}>
          <Surface padded={false} style={{ overflow: "hidden" }}>
            {board.value.challenges.map((challenge, index) => (
              <View key={challenge.id}>
                {index > 0 ? <Hairline /> : null}
                <ChallengeCard
                  card={challengeCardView(
                    challengeCardInput(challenge),
                    locale,
                    now,
                  )}
                  onOpen={props.onOpenChallenge}
                  onAccept={props.onAcceptChallenge}
                />
              </View>
            ))}
          </Surface>
          <Text size="eyebrow" tone="muted">
            {m.challenge.tab.openFootnote}
          </Text>
        </View>
      )}
    </View>
  );
}

import { spacing } from "@repo/design-tokens";
import {
  challengeBoardFilterGroups,
  challengeBoardHasFilters,
  challengeCardView,
  type ChallengeBoardFilterKey,
  type ChallengeBoardFilters,
} from "@repo/domain/challenge-card";
import { useState } from "react";
import { View } from "react-native";

import { ChipGrid, ChoiceChip } from "../create-game/chips";
import { Notice } from "../groups/notice";
import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { ChallengeCard } from "./challenge-card";
import { challengeCardInput, type OpenChallenge } from "./challenges-model";
import { SegmentEmpty } from "./segment-empty";

export type OpenSegmentProps = {
  board: Slot<{ challenges: OpenChallenge[]; areas: string[] }>;
  filters: ChallengeBoardFilters;
  onFilter: (key: ChallengeBoardFilterKey, value: string | null) => void;
  onClearFilters: () => void;
  onOpenChallenge: (challengeId: string) => void;
  onPost: () => void;
  onGoToTeams: () => void;
  onRetry: () => void;
};

function FilterBar({
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
    <View
      accessibilityLabel={m.challenge.filters.label}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      {groups.map((group) => (
        <ChoiceChip
          key={group.key}
          label={m.challenge.filters.chip(group.label, group.summary)}
          selected={filters[group.key] != null}
          selection="soft"
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
    </View>
  );
}

/** 1a: the Open board, filter chips, and Post a challenge. */
export function OpenSegment(props: OpenSegmentProps) {
  const m = useMessages();
  const locale = useLocale();
  const now = new Date();
  const { board } = props;
  if (board.status === "loading") {
    return (
      <View style={{ gap: 12 }}>
        {[0, 1].map((key) => (
          <Skeleton key={key} height={180} radius={16} />
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
    return (
      <View style={{ gap: spacing.compact }}>
        <Button label={m.challenge.post.cta} size="lg" onPress={props.onPost} />
        <SegmentEmpty segment="open" onGoToTeams={props.onGoToTeams} />
      </View>
    );
  }
  return (
    <View style={{ gap: spacing.compact }}>
      <Button label={m.challenge.post.cta} size="lg" onPress={props.onPost} />
      <FilterBar
        filters={props.filters}
        areas={board.value.areas}
        onFilter={props.onFilter}
        onClearFilters={props.onClearFilters}
      />
      {board.value.challenges.length === 0 ? (
        <View style={{ gap: 4 }}>
          <Text weight="semibold">{m.challenge.open.filteredEmptyTitle}</Text>
          <Text size="meta" tone="muted">
            {m.challenge.open.filteredEmptyCopy}
          </Text>
        </View>
      ) : (
        board.value.challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            card={challengeCardView(challengeCardInput(challenge), locale, now)}
            onOpen={props.onOpenChallenge}
          />
        ))
      )}
    </View>
  );
}

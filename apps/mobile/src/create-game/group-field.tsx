import {
  VISIBLE_GROUP_CHIP_COUNT,
  visibleCreateGroups,
  type CreateGroupOption,
} from "@repo/domain/create-game-flow";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { useLocale, useMessages } from "../i18n/locale-provider";

import { ChipGrid, ChoiceChip, FieldError } from "./chips";
import { SearchSheet } from "./search-sheet";
import { StepSection } from "./step-section";
import { groupSheetLabel, labelMatchesQuery } from "./venue-sheet";

export function groupLabel(
  group: {
    name: string | null;
    venueName: string | null;
  },
  locale: Locale,
) {
  return (
    group.name ??
    group.venueName ??
    messagesFor(locale).mobileCreateGame.group.untitled
  );
}

export function GroupField({
  groups,
  groupId,
  error,
  noneLabel,
  onSelect,
}: {
  groups: readonly CreateGroupOption[];
  groupId: string;
  error?: string;
  noneLabel?: string;
  onSelect: (groupId: string) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const copy = m.mobileCreateGame.group;
  const [changing, setChanging] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const selected = groups.find((group) => group.id === groupId);
  const collapsed = selected !== undefined && !changing;
  const pick = (id: string) => {
    setChanging(false);
    if (id !== groupId) {
      onSelect(id);
    }
  };

  return (
    <StepSection
      title={copy.title}
      note={
        collapsed
          ? undefined
          : noneLabel
            ? m.common.optional
            : m.common.required
      }
      link={
        collapsed
          ? {
              label: copy.change,
              accessibilityLabel: copy.changeA11y,
              onPress: () => setChanging(true),
            }
          : undefined
      }
    >
      {collapsed ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={copy.title}
          style={{ flexDirection: "row" }}
        >
          <ChoiceChip
            role="radio"
            selected
            check
            label={groupLabel(selected, locale)}
            onPress={() => setChanging(true)}
          />
        </View>
      ) : (
        <ChipGrid
          label={copy.title}
          check
          chips={[
            ...(noneLabel ? [{ value: "", label: noneLabel }] : []),
            ...visibleCreateGroups(groups, groupId).map((group) => ({
              value: group.id,
              label: groupLabel(group, locale),
            })),
          ]}
          isSelected={(id) => id === groupId}
          onSelect={pick}
          escape={
            groups.length > VISIBLE_GROUP_CHIP_COUNT
              ? {
                  label: copy.allCount(groups.length),
                  icon: Search,
                  onPress: () => setSheetOpen(true),
                }
              : undefined
          }
        />
      )}
      <SearchSheet
        visible={sheetOpen}
        title={copy.allCount(groups.length)}
        placeholder={copy.namePlaceholder}
        listLabel={copy.title}
        selectedId={groupId}
        filter={(query) =>
          groups
            .map((group) => ({
              id: group.id,
              title: groupLabel(group, locale),
            }))
            .filter((row) => labelMatchesQuery(row.title, query))
        }
        resultLabel={(query, count) => groupSheetLabel(query, count, locale)}
        emptyMessage={copy.noMatch}
        onPick={pick}
        onClose={() => setSheetOpen(false)}
      />
      <FieldError message={error} />
    </StepSection>
  );
}

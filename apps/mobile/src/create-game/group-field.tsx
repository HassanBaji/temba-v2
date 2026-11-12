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
import { HelperNote, StepSection } from "./step-section";
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

/** No Group id is a uuid, so this value never clashes with one. */
const PUBLIC_CHIP = "public";

/** The Public game chip beside the Groups: a Public Game has no Group. */
export type PublicGameChoice = {
  label: string;
  note: string;
  selected: boolean;
  onSelect: () => void;
};

export function GroupField({
  groups,
  groupId,
  error,
  noneLabel,
  publicChoice,
  onSelect,
}: {
  groups: readonly CreateGroupOption[];
  groupId: string;
  error?: string;
  noneLabel?: string;
  publicChoice?: PublicGameChoice;
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
            ...(publicChoice
              ? [{ value: PUBLIC_CHIP, label: publicChoice.label }]
              : []),
          ]}
          isSelected={(id) =>
            id === PUBLIC_CHIP
              ? publicChoice?.selected === true
              : id === groupId && publicChoice?.selected !== true
          }
          onSelect={(id) => {
            if (id === PUBLIC_CHIP) {
              setChanging(false);
              publicChoice?.onSelect();
              return;
            }
            pick(id);
          }}
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
      {publicChoice?.selected ? (
        <HelperNote>{publicChoice.note}</HelperNote>
      ) : null}
      <FieldError message={error} />
    </StepSection>
  );
}

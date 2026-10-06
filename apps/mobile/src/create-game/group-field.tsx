import {
  VISIBLE_GROUP_CHIP_COUNT,
  visibleCreateGroups,
  type CreateGroupOption,
} from "@repo/domain/create-game-flow";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { ChipGrid, ChoiceChip, FieldError } from "./chips";
import { SearchSheet } from "./search-sheet";
import { StepSection } from "./step-section";
import { groupSheetLabel, labelMatchesQuery } from "./venue-sheet";

export function groupLabel(group: {
  name: string | null;
  communityName: string | null;
}) {
  return group.name ?? group.communityName ?? "Untitled Group";
}

export function GroupField({
  groups,
  groupId,
  error,
  onSelect,
}: {
  groups: readonly CreateGroupOption[];
  groupId: string;
  error?: string;
  onSelect: (groupId: string) => void;
}) {
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
      title="Group"
      note={collapsed ? undefined : "Required"}
      link={
        collapsed
          ? {
              label: "Change",
              accessibilityLabel: "Change Group",
              onPress: () => setChanging(true),
            }
          : undefined
      }
    >
      {collapsed ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="Group"
          style={{ flexDirection: "row" }}
        >
          <ChoiceChip
            role="radio"
            selected
            check
            label={groupLabel(selected)}
            onPress={() => setChanging(true)}
          />
        </View>
      ) : (
        <ChipGrid
          label="Group"
          check
          chips={visibleCreateGroups(groups, groupId).map((group) => ({
            value: group.id,
            label: groupLabel(group),
          }))}
          isSelected={(id) => id === groupId}
          onSelect={pick}
          escape={
            groups.length > VISIBLE_GROUP_CHIP_COUNT
              ? {
                  label: `All ${groups.length} groups`,
                  icon: Search,
                  onPress: () => setSheetOpen(true),
                }
              : undefined
          }
        />
      )}
      <SearchSheet
        visible={sheetOpen}
        title={`All ${groups.length} groups`}
        placeholder="Group name"
        listLabel="Group"
        selectedId={groupId}
        filter={(query) =>
          groups
            .map((group) => ({ id: group.id, title: groupLabel(group) }))
            .filter((row) => labelMatchesQuery(row.title, query))
        }
        resultLabel={groupSheetLabel}
        emptyMessage={(query) => `No Groups match “${query}”.`}
        onPick={pick}
        onClose={() => setSheetOpen(false)}
      />
      <FieldError message={error} />
    </StepSection>
  );
}

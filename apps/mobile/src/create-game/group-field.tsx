import {
  VISIBLE_GROUP_CHIP_COUNT,
  visibleCreateGroups,
  type CreateGroupOption,
} from "@repo/domain/create-game-flow";
import { Search } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { ChipGrid, ChoiceChip, FieldError } from "./chips";
import { StepSection } from "./step-section";

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
  const selected = groups.find((group) => group.id === groupId);
  const collapsed = selected !== undefined && !changing;

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
          onSelect={(id) => {
            setChanging(false);
            if (id !== groupId) {
              onSelect(id);
            }
          }}
          escape={
            groups.length > VISIBLE_GROUP_CHIP_COUNT
              ? { label: `All ${groups.length} groups`, icon: Search }
              : undefined
          }
        />
      )}
      <FieldError message={error} />
    </StepSection>
  );
}

import { colors, sizes, spacing } from "@repo/design-tokens";
import {
  checklistCountLabel,
  homeChecklistAfterSkip,
  homeChecklistRows,
  type ProfileChecklist,
  type ProfileTask,
} from "@repo/domain/profile-checklist";
import { ArrowRight, ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import {
  ChecklistSegments,
  TaskMarker,
} from "../profile-tasks/checklist-marks";
import {
  checklistChipLabel,
  checklistChipTasks,
} from "../profile-tasks/profile-tasks-model";
import type { HomeNavTarget } from "./home-target";

const ROW_PADDING_Y = 12;
const FOOTER_ICON = 14;

export type ProfileChecklistCardProps = {
  list: ProfileChecklist;
  skipped: boolean;
  onNavigate: (target: HomeNavTarget) => void;
  onSkip: () => void;
  onShow: () => void;
};

function TaskRow({
  task,
  onPress,
}: {
  task: ProfileTask;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${task.title}. ${task.description}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: spacing.surface,
        paddingVertical: ROW_PADDING_Y,
        backgroundColor: pressed ? colors.wash : undefined,
      })}
    >
      <TaskMarker done={task.done} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text weight="semibold" numberOfLines={1}>
          {task.title}
        </Text>
        <Text size="meta" tone="muted" numberOfLines={1}>
          {task.description}
        </Text>
      </View>
      <ChevronRight size={sizes.iconAction} color={colors.muted} />
    </Pressable>
  );
}

function FooterLink({
  label,
  onPress,
  icon,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text size="meta" weight="medium">
        {label}
      </Text>
      {icon}
    </Pressable>
  );
}

export function ProfileChecklistCard({
  list,
  skipped,
  onNavigate,
  onSkip,
  onShow,
}: ProfileChecklistCardProps) {
  const openTask = (task: ProfileTask) =>
    onNavigate({ kind: "profile-task", task: task.id });

  if (skipped) {
    const required = homeChecklistAfterSkip(list);
    return (
      <Surface tone="paper" padded={false} style={{ overflow: "hidden" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Profile ${list.done} of ${list.total}. Show the checklist`}
          onPress={onShow}
          style={({ pressed }) => ({
            minHeight: sizes.touchTarget,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: spacing.surface,
            paddingVertical: ROW_PADDING_Y,
            backgroundColor: pressed ? colors.wash : undefined,
          })}
        >
          <Text size="meta" weight="semibold" numberOfLines={1}>
            {checklistChipLabel(list)}
          </Text>
          <Text
            size="meta"
            tone="muted"
            numberOfLines={1}
            style={{ flex: 1, minWidth: 0 }}
          >
            {checklistChipTasks(list)}
          </Text>
          <ChevronRight size={sizes.iconRow} color={colors.muted} />
        </Pressable>
        {required.map((task) => (
          <View key={task.id}>
            <Hairline />
            <TaskRow task={task} onPress={() => openTask(task)} />
          </View>
        ))}
      </Surface>
    );
  }

  const rows = homeChecklistRows(list);
  return (
    <Surface tone="paper" padded={false} style={{ overflow: "hidden" }}>
      <View
        style={{
          gap: 10,
          paddingHorizontal: spacing.surface,
          paddingTop: spacing.surface,
          paddingBottom: 6,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="lead" weight="semibold" accessibilityRole="header">
            Complete your profile
          </Text>
          <Text size="eyebrow" tone="muted" mono uppercase>
            {checklistCountLabel(list)}
          </Text>
        </View>
        <ChecklistSegments
          done={list.done}
          total={list.total}
          label={`Profile ${list.done} of ${list.total} done`}
        />
      </View>
      {rows.shown.map((task) => (
        <View key={task.id}>
          <TaskRow task={task} onPress={() => openTask(task)} />
          <Hairline />
        </View>
      ))}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.surface,
          paddingVertical: 2,
        }}
      >
        <FooterLink
          label={rows.more}
          accessibilityLabel={`${rows.more}. Open the checklist`}
          icon={<ArrowRight size={FOOTER_ICON} color={colors.ink} />}
          onPress={() => onNavigate({ kind: "complete-profile" })}
        />
        <FooterLink label="Skip for now" onPress={onSkip} />
      </View>
    </Surface>
  );
}

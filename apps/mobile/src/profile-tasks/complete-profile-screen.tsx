import { colors, radii, sizes } from "@repo/design-tokens";
import {
  checklistBlurb,
  checklistCountLabel,
  checklistCta,
  youAreInTitle,
  type ProfileChecklist,
  type ProfileTask,
} from "@repo/domain/profile-checklist";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AuthLoading } from "../auth/auth-loading";
import { AuthScreen } from "../auth/auth-screen";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { InitialsTile } from "../primitives/initials-tile";
import { Text } from "../primitives/text";
import { ChecklistSegments, TaskMarker } from "./checklist-marks";
import { profileTaskPath } from "./profile-tasks-model";
import { exitChecklist, leaveChecklist } from "./task-navigation";
import { useProfileChecklist } from "./use-profile-checklist";

const ROW_PADDING = { paddingVertical: 14, paddingHorizontal: 16 } as const;

function openTask(task: ProfileTask) {
  router.push(profileTaskPath(task.id));
}

function TaskList({
  tasks,
  trailing,
}: {
  tasks: ProfileTask[];
  trailing: "time" | "chevron";
}) {
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: colors.rule,
        borderRadius: radii.card,
        overflow: "hidden",
      }}
    >
      {tasks.map((task, index) => (
        <View key={task.id}>
          {index > 0 ? <Hairline /> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${task.title}. ${task.description}`}
            accessibilityState={{ checked: task.done }}
            onPress={() => openTask(task)}
            style={({ pressed }) => ({
              ...ROW_PADDING,
              minHeight: sizes.touchTarget,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              backgroundColor: pressed ? colors.wash : colors.paper,
            })}
          >
            <TaskMarker done={task.done} />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text
                weight="semibold"
                tone={task.done ? "muted" : "default"}
                numberOfLines={1}
                style={
                  task.done ? { textDecorationLine: "line-through" } : undefined
                }
              >
                {task.title}
              </Text>
              {trailing === "chevron" ? (
                <Text size="meta" tone="muted" numberOfLines={2}>
                  {task.description}
                </Text>
              ) : null}
            </View>
            {trailing === "time" ? (
              <Text size="meta" tone="muted" mono>
                {task.time}
              </Text>
            ) : (
              <ChevronRight size={sizes.iconAction} color={colors.muted} />
            )}
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function DoneRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        ...ROW_PADDING,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      <TaskMarker done />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text size="meta" tone="muted">
          {label}
        </Text>
        <Text weight="semibold" numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ProgressRow({ list }: { list: ProfileChecklist }) {
  return (
    <View style={{ gap: 10 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "baseline",
        }}
      >
        <Text size="meta" tone="muted">
          Profile
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
  );
}

function YouAreIn({
  list,
  name,
  firstName,
  onCompleteProfile,
}: {
  list: ProfileChecklist;
  name: string;
  firstName: string | null;
  onCompleteProfile: () => void;
}) {
  return (
    <AuthScreen
      crossLink={{ label: "Skip", onPress: leaveChecklist }}
      action={
        <>
          <Button
            label="Complete profile"
            size="lg"
            onPress={onCompleteProfile}
          />
          <Button
            label="Later, show me games"
            size="lg"
            variant="outline"
            onPress={leaveChecklist}
          />
        </>
      }
    >
      <View style={{ gap: 18 }}>
        <InitialsTile name={name} size="lg" />
        <View style={{ gap: 10 }}>
          <Text size="h1Lg" weight="bold" accessibilityRole="header">
            {youAreInTitle(firstName)}
          </Text>
          <Text tone="muted">
            Your account works as it is. A fuller profile gets you matched
            games, a rating and receipts by email. {checklistBlurb(list)}
          </Text>
        </View>
      </View>
      <ProgressRow list={list} />
      <TaskList tasks={list.tasks} trailing="time" />
    </AuthScreen>
  );
}

function Checklist({
  list,
  name,
  phone,
}: {
  list: ProfileChecklist;
  name: string | null;
  phone: string | null;
}) {
  const doneAtSignUp = [
    name ? { label: "Name", value: name } : null,
    phone ? { label: "Mobile number", value: phone } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <AuthScreen
      onBack={exitChecklist}
      meta={`${checklistCountLabel(list)} done`}
      progress={{
        step: list.done,
        total: list.total,
        label: `Profile ${list.done} of ${list.total} done`,
      }}
      title="Complete your profile"
      description={checklistBlurb(list)}
      action={
        <Button label={checklistCta(list)} size="lg" onPress={leaveChecklist} />
      }
    >
      {doneAtSignUp.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Text size="meta" tone="muted" accessibilityRole="header">
            Done at sign up
          </Text>
          <View
            style={{
              borderWidth: hairline,
              borderColor: colors.rule,
              borderRadius: radii.card,
              overflow: "hidden",
            }}
          >
            {doneAtSignUp.map((row, index) => (
              <View key={row.label}>
                {index > 0 ? <Hairline /> : null}
                <DoneRow label={row.label} value={row.value} />
              </View>
            ))}
          </View>
        </View>
      ) : null}
      <View style={{ gap: 10 }}>
        <Text size="meta" tone="muted" accessibilityRole="header">
          Tasks
        </Text>
        <TaskList tasks={list.tasks} trailing="chevron" />
      </View>
    </AuthScreen>
  );
}

export function CompleteProfileScreen() {
  const { fresh } = useLocalSearchParams<{ fresh?: string }>();
  const [showingList, setShowingList] = useState(false);
  const { user, list, error, refetch } = useProfileChecklist();

  if (error && !list) {
    return (
      <AuthScreen
        onBack={exitChecklist}
        title="Profile could not be loaded"
        description={error.message}
      >
        <Button label="Try again" size="lg" onPress={() => void refetch()} />
      </AuthScreen>
    );
  }
  if (!user || !list) {
    return <AuthLoading />;
  }

  const name = user.fullName ?? user.firstName ?? null;
  const phone = user.primaryPhoneNumber?.phoneNumber ?? null;

  if (fresh === "1" && !showingList) {
    return (
      <YouAreIn
        list={list}
        name={name ?? "You"}
        firstName={user.firstName}
        onCompleteProfile={() => setShowingList(true)}
      />
    );
  }
  return <Checklist list={list} name={name} phone={phone} />;
}

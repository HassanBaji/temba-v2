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
import { useLocale, useMessages } from "../i18n/locale-provider";
import { mirrorInRtl } from "../i18n/rtl";
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
  const m = useMessages();
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
            accessibilityLabel={m.mobileHome.checklist.taskSpoken(
              task.title,
              task.description,
            )}
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
              <ChevronRight
                size={sizes.iconAction}
                color={colors.muted}
                style={mirrorInRtl}
              />
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
  const m = useMessages();
  const locale = useLocale();
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
          {m.common.profile}
        </Text>
        <Text size="eyebrow" tone="muted" mono uppercase>
          {checklistCountLabel(list, locale)}
        </Text>
      </View>
      <ChecklistSegments
        done={list.done}
        total={list.total}
        label={m.mobileHome.checklist.progressSpoken(list.done, list.total)}
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
  const m = useMessages();
  const locale = useLocale();
  return (
    <AuthScreen
      crossLink={{ label: m.mobileHome.tasks.skip, onPress: leaveChecklist }}
      action={
        <>
          <Button
            label={m.mobileHome.tasks.completeProfile}
            size="lg"
            onPress={onCompleteProfile}
          />
          <Button
            label={m.mobileHome.tasks.laterShowGames}
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
            {youAreInTitle(firstName, locale)}
          </Text>
          <Text tone="muted">
            {m.mobileHome.tasks.youAreInBody} {checklistBlurb(list, locale)}
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
  const m = useMessages();
  const locale = useLocale();
  const doneAtSignUp = [
    name ? { label: m.mobileHome.tasks.short.name, value: name } : null,
    phone ? { label: m.mobileHome.fields.mobileNumber, value: phone } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <AuthScreen
      onBack={exitChecklist}
      meta={m.mobileHome.tasks.countDone(checklistCountLabel(list, locale))}
      progress={{
        step: list.done,
        total: list.total,
        label: m.mobileHome.checklist.progressSpoken(list.done, list.total),
      }}
      title={m.mobileHome.checklist.title}
      description={checklistBlurb(list, locale)}
      action={
        <Button
          label={checklistCta(list, locale)}
          size="lg"
          onPress={leaveChecklist}
        />
      }
    >
      {doneAtSignUp.length > 0 ? (
        <View style={{ gap: 10 }}>
          <Text size="meta" tone="muted" accessibilityRole="header">
            {m.mobileHome.tasks.doneAtSignUp}
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
          {m.mobileHome.tasks.heading}
        </Text>
        <TaskList tasks={list.tasks} trailing="chevron" />
      </View>
    </AuthScreen>
  );
}

export function CompleteProfileScreen() {
  const m = useMessages();
  const { fresh } = useLocalSearchParams<{ fresh?: string }>();
  const [showingList, setShowingList] = useState(false);
  const { user, list, error, refetch } = useProfileChecklist();

  if (error && !list) {
    return (
      <AuthScreen
        onBack={exitChecklist}
        title={m.mobileHome.block.couldNotLoad(m.common.profile)}
        description={error.message}
      >
        <Button
          label={m.common.tryAgain}
          size="lg"
          onPress={() => void refetch()}
        />
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
        name={name ?? m.common.you}
        firstName={user.firstName}
        onCompleteProfile={() => setShowingList(true)}
      />
    );
  }
  return <Checklist list={list} name={name} phone={phone} />;
}

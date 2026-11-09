import {
  challengeSlotDayOptions,
  challengeSlotInstant,
  challengeSlotTimeOptions,
} from "@repo/domain/challenge-form";
import { useState } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { PostChallengeChip, PostChallengeGrid } from "./post-challenge-parts";

const DEFAULT_SLOT_MINUTES = 19 * 60;

/** "Add slot": a day in the next two weeks and a start on the half hour. */
export function PostChallengeSlotSheet({
  visible,
  now,
  onClose,
  onAdd,
}: {
  visible: boolean;
  now: Date;
  onClose: () => void;
  onAdd: (slot: Date) => void;
}) {
  const copy = useMessages().challenge.post;
  const locale = useLocale();
  const days = challengeSlotDayOptions(now, locale);
  const [day, setDay] = useState(() => days[1]?.value ?? "");
  const [minutes, setMinutes] = useState(DEFAULT_SLOT_MINUTES);
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={copy.slotTitle}
      closeButton
      tall
      footer={
        <Button
          label={copy.addSlot}
          size="lg"
          onPress={() => {
            onAdd(challengeSlotInstant(day, minutes));
            onClose();
          }}
        />
      }
    >
      <View style={{ gap: 8 }}>
        <Text size="meta" tone="muted">
          {copy.slotDay}
        </Text>
        <PostChallengeGrid label={copy.slotDay} columns={4}>
          {days.map((option) => (
            <PostChallengeChip
              key={option.value}
              label={option.label}
              accessibilityLabel={option.accessibilityLabel}
              selected={option.value === day}
              onPress={() => setDay(option.value)}
            />
          ))}
        </PostChallengeGrid>
      </View>
      <View style={{ gap: 8 }}>
        <Text size="meta" tone="muted">
          {copy.slotTime}
        </Text>
        <PostChallengeGrid label={copy.slotTime} columns={4}>
          {challengeSlotTimeOptions(locale).map((option) => (
            <PostChallengeChip
              key={option.value}
              label={option.label}
              ltr
              selected={option.value === minutes}
              onPress={() => setMinutes(option.value)}
            />
          ))}
        </PostChallengeGrid>
      </View>
    </Sheet>
  );
}

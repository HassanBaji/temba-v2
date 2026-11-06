import type { GroupJoinRequestData } from "@repo/domain/group-data";
import {
  groupJoinRequestMeta,
  groupRejectRequestCopy,
  groupWhoCanJoinDescription,
} from "@repo/domain/group-admin";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { ChoiceCard } from "../primitives/choice-card";
import { Hairline } from "../primitives/hairline";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";

function SheetAction({
  label,
  pending,
  disabled,
  onPress,
}: {
  label: string;
  pending: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const m = useMessages();
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy: pending }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        justifyContent: "center",
        paddingHorizontal: 18,
        backgroundColor: pressed ? colors.wash : colors.paper,
        opacity: disabled && !pending ? 0.5 : 1,
      })}
    >
      <Text weight="semibold">
        {pending ? m.mobileGroup.requests.pending(label) : label}
      </Text>
    </Pressable>
  );
}

export function RejectRequestSheet({
  request,
  apiOrigin,
  pending,
  onReject,
  onClose,
}: {
  request: GroupJoinRequestData | null;
  apiOrigin: string;
  pending: "reject" | "block" | null;
  onReject: (block: boolean) => void;
  onClose: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const name = request?.user.name ?? m.mobileGroup.unnamedUser;
  const copy = groupRejectRequestCopy(name, locale);
  return (
    <Sheet visible={request != null} onClose={onClose}>
      {request ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar
              name={name}
              uri={mediaUrl(request.user.image, apiOrigin)}
              size="lg"
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text size="lead" weight="semibold" accessibilityRole="header">
                {copy.title}
              </Text>
              <Text size="meta" tone="muted" numberOfLines={2}>
                {groupJoinRequestMeta(request, locale)}
              </Text>
            </View>
          </View>
          <Text size="meta" tone="muted">
            {copy.description}
          </Text>
          <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
            <SheetAction
              label={copy.rejectLabel}
              pending={pending === "reject"}
              disabled={pending != null}
              onPress={() => onReject(false)}
            />
            <Hairline />
            <SheetAction
              label={copy.blockLabel}
              pending={pending === "block"}
              disabled={pending != null}
              onPress={() => onReject(true)}
            />
          </Surface>
          <Button
            label={copy.cancelLabel}
            size="lg"
            variant="outline"
            disabled={pending != null}
            onPress={onClose}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

export function WhoCanJoinSheet({
  visible,
  requiresApproval,
  pending,
  onSave,
  onClose,
}: {
  visible: boolean;
  requiresApproval: boolean;
  pending: boolean;
  onSave: (requiresApproval: boolean) => void;
  onClose: () => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const copy = m.group.admin.whoCanJoin;
  const [choice, setChoice] = useState(requiresApproval);

  useEffect(() => {
    if (visible) {
      setChoice(requiresApproval);
    }
  }, [visible, requiresApproval]);

  return (
    <Sheet visible={visible} onClose={onClose} title={copy.title}>
      <View style={{ gap: 16 }}>
        <Text size="meta" tone="muted">
          {groupWhoCanJoinDescription(locale)}
        </Text>
        <View accessibilityRole="radiogroup" style={{ gap: 8 }}>
          <ChoiceCard
            role="radio"
            selected={choice}
            title={copy.approve.title}
            description={copy.approve.description}
            disabled={pending}
            onPress={() => setChoice(true)}
          />
          <ChoiceCard
            role="radio"
            selected={!choice}
            title={copy.open.title}
            description={copy.open.description}
            disabled={pending}
            onPress={() => setChoice(false)}
          />
        </View>
        <Button
          label={m.common.done}
          size="lg"
          pending={pending}
          onPress={() =>
            choice === requiresApproval ? onClose() : onSave(choice)
          }
        />
      </View>
    </Sheet>
  );
}

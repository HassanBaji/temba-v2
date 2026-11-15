import { View } from "react-native";

import { useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { NotOnTembaMark } from "../primitives/not-on-temba-mark";
import { Sheet } from "../primitives/sheet";
import { SheetMenu, SheetMenuRow } from "../primitives/sheet-menu";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import type { MemberSheetView } from "./group-home-model";

/**
 * The row menu on the Members tab in Manage mode (design "Group members" 2b):
 * who this is, then the doors the viewer holds on them.
 */
export function MemberSheet({
  member,
  onClose,
  onCall,
  onWhatsApp,
  onSetLevel,
  onViewProfile,
  onAdjustTier,
  onTierHistory,
  onNickname,
  organizerLabel,
  organizerHint,
  onOrganizerAction,
  onRename,
  onRemove,
}: {
  member: MemberSheetView | null;
  onClose: () => void;
  onCall?: (href: string) => void;
  onWhatsApp?: (href: string) => void;
  onSetLevel?: () => void;
  onViewProfile?: () => void;
  /** An Organizer of a tier Group moves this member's Tier points. */
  onAdjustTier?: () => void;
  /** An Organizer of a tier Group reads what moved this member's points. */
  onTierHistory?: () => void;
  /** Opens "Name in this Group" (design "Group names" 1b). */
  onNickname?: () => void;
  organizerLabel?: string;
  organizerHint?: string;
  onOrganizerAction?: () => void;
  onRename?: () => void;
  onRemove?: () => void;
}) {
  const m = useMessages();
  const phoneHref = member?.phoneHref;
  const chatHref = member?.whatsAppHref;
  const rows = member
    ? [
        phoneHref && onCall ? (
          <SheetMenuRow
            key="call"
            label={m.mobileGroup.members.sheet.call}
            hint={member.phone}
            onPress={() => onCall(phoneHref)}
          />
        ) : null,
        chatHref && onWhatsApp ? (
          <SheetMenuRow
            key="whatsapp"
            label={m.group.addPlayer.whatsAppAction}
            hint={member.phone}
            onPress={() => onWhatsApp(chatHref)}
          />
        ) : null,
        onViewProfile ? (
          <SheetMenuRow
            key="profile"
            label={m.mobileGroup.members.sheet.viewProfile}
            trailing="chevron"
            onPress={onViewProfile}
          />
        ) : null,
        onTierHistory ? (
          <SheetMenuRow
            key="tier-history"
            label={m.rating.history.menuRow}
            hint={m.rating.history.menuHint}
            trailing="chevron"
            onPress={onTierHistory}
          />
        ) : null,
        onAdjustTier ? (
          <SheetMenuRow
            key="adjust-tier"
            label={m.rating.adjust.menuRow}
            hint={m.rating.adjust.menuHint}
            trailing="chevron"
            onPress={onAdjustTier}
          />
        ) : null,
        onNickname ? (
          <SheetMenuRow
            key="nickname"
            label={
              member.nickname
                ? m.group.nickname.menuLabel
                : m.group.nickname.addMenuLabel
            }
            hint={m.group.nickname.menuHint}
            value={member.nickname ?? undefined}
            trailing="chevron"
            onPress={onNickname}
          />
        ) : null,
        onSetLevel ? (
          <SheetMenuRow
            key="level"
            label={m.mobileGroup.members.sheet.setLevel}
            hint={
              member.provisionalNote
                ? m.mobileGroup.members.sheet.stillProvisional
                : null
            }
            trailing="chevron"
            onPress={onSetLevel}
          />
        ) : null,
        organizerLabel && onOrganizerAction ? (
          <SheetMenuRow
            key="organizer"
            label={organizerLabel}
            hint={organizerHint}
            onPress={onOrganizerAction}
          />
        ) : null,
        onRename ? (
          <SheetMenuRow
            key="rename"
            label={m.group.addPlayer.renameAction}
            onPress={onRename}
          />
        ) : null,
        onRemove ? (
          <SheetMenuRow
            key="remove"
            label={m.group.addPlayer.removeAction}
            onPress={onRemove}
          />
        ) : null,
      ]
    : [];

  return (
    <Sheet visible={member != null} onClose={onClose}>
      {member ? (
        <View style={{ gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Avatar name={member.name} uri={member.imageUri} size="lg" />
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text size="lead" weight="semibold" accessibilityRole="header">
                {member.name}
              </Text>
              {member.unclaimed ? (
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <NotOnTembaMark />
                  {member.phone || member.phoneMasked ? (
                    <Text size="meta" tone="muted" ltr>
                      {member.phone ?? member.phoneMasked}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text size="meta" tone="muted" numberOfLines={1}>
                  {member.caption ?? member.summary}
                </Text>
              )}
            </View>
          </View>
          {onSetLevel ? (
            <Surface radius="card" style={{ gap: 8 }}>
              <View
                accessible
                accessibilityLabel={
                  member.letter
                    ? m.mobileGroup.members.levelSpoken(
                        `${member.letter} ${member.level ?? ""}`.trim(),
                      )
                    : m.mobileGroup.members.noLevelYet
                }
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: 12,
                }}
              >
                <Text size="statTotal" width="expanded" weight="bold">
                  {member.letter ?? m.mobileGroup.members.sheet.noLevelMark}
                </Text>
                {member.level ? (
                  <Text size="title" width="expanded" weight="bold">
                    {member.level}
                  </Text>
                ) : null}
                <Text size="meta" tone="muted" style={{ flex: 1 }}>
                  {member.summary}
                </Text>
              </View>
              {member.provisionalNote ? (
                <Text size="meta" tone="muted">
                  {member.provisionalNote}
                </Text>
              ) : null}
              {member.latestSet ? (
                <Text size="meta" tone="muted">
                  {m.mobileGroup.members.latestSet(member.latestSet)}
                </Text>
              ) : null}
            </Surface>
          ) : null}
          {rows.some(Boolean) ? <SheetMenu>{rows}</SheetMenu> : null}
          <Button
            label={m.common.cancel}
            size="lg"
            variant="outline"
            onPress={onClose}
          />
        </View>
      ) : null}
    </Sheet>
  );
}

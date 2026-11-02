import type { GroupLeaderboardEntryData } from "@repo/domain/group-data";
import { groupMemberTableCaption } from "@repo/domain/group-members-table";
import {
  groupTransferCandidates,
  groupTransferConfirmLabel,
  groupTransferOwnershipCopy,
} from "@repo/domain/group-settings";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { mediaUrl } from "../lib/media-url";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { RadioRow } from "./group-form-parts";

const TALL_FROM = 6;

export function TransferOwnershipSheet({
  visible,
  groupName,
  members,
  apiOrigin,
  pending,
  onTransfer,
  onClose,
}: {
  visible: boolean;
  groupName: string | null;
  members: readonly GroupLeaderboardEntryData[];
  apiOrigin: string;
  pending: boolean;
  onTransfer: (member: { userId: string; name: string }) => void;
  onClose: () => void;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);
  useEffect(() => {
    if (visible) {
      setPickedId(null);
    }
  }, [visible]);
  const copy = groupTransferOwnershipCopy(groupName);
  const candidates = groupTransferCandidates(members);
  const picked = candidates.find((member) => member.userId === pickedId);
  const tall = candidates.length >= TALL_FROM;

  const confirm = (
    <Button
      label={groupTransferConfirmLabel(picked?.name ?? null)}
      size="lg"
      pending={pending}
      disabled={!picked}
      onPress={() => {
        if (picked) {
          onTransfer({ userId: picked.userId, name: picked.name ?? "Member" });
        }
      }}
    />
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={copy.title}
      subtitle={copy.description}
      tall={tall}
      footer={tall ? confirm : undefined}
      closeButton
    >
      <View style={{ gap: 14 }}>
        {candidates.length === 0 ? (
          <Text size="meta" tone="muted">
            {copy.empty}
          </Text>
        ) : (
          <Surface
            accessibilityRole="radiogroup"
            padded={false}
            radius="card"
            style={{ overflow: "hidden" }}
          >
            {candidates.map((member, index) => {
              const name = member.name ?? "Member";
              return (
                <View key={member.userId}>
                  {index > 0 ? <Hairline /> : null}
                  <RadioRow
                    title={name}
                    description={groupMemberTableCaption(member)}
                    selected={member.userId === pickedId}
                    disabled={pending}
                    onPress={() => setPickedId(member.userId)}
                    leading={
                      <Avatar
                        name={name}
                        uri={mediaUrl(member.image, apiOrigin)}
                        size="lg"
                      />
                    }
                  />
                </View>
              );
            })}
          </Surface>
        )}
        {tall ? null : confirm}
      </View>
    </Sheet>
  );
}

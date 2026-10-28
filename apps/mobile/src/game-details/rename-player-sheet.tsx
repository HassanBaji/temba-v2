import {
  ADD_PLAYER_NAME_LABEL,
  RENAME_UNCLAIMED_PLAYER_ACTION,
  RENAME_UNCLAIMED_PLAYER_DESCRIPTION,
  UNCLAIMED_PLAYER_NAME_MAX_LENGTH,
  renameUnclaimedPlayerCanSubmit,
  renameUnclaimedPlayerToast,
} from "@repo/domain/add-player-by-phone";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { FieldError } from "../create-game/chips";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

export function RenamePlayerSheet({
  player,
  onClose,
}: {
  player: { userId: string; name: string } | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const utils = api.useUtils();
  const [name, setName] = useState(player?.name ?? "");

  useEffect(() => {
    if (player) {
      setName(player.name);
    }
  }, [player]);

  const rename = api.users.renameUnclaimedPlayer.useMutation({
    onSuccess: async (result) => {
      toast.show(renameUnclaimedPlayerToast(result.name));
      await Promise.all([
        utils.games.byId.invalidate(),
        utils.groups.byId.invalidate(),
        utils.users.playerProfile.invalidate(),
      ]);
      onClose();
    },
  });

  const canSubmit =
    player != null &&
    !rename.isPending &&
    renameUnclaimedPlayerCanSubmit({ current: player.name, next: name });

  function close() {
    rename.reset();
    onClose();
  }

  return (
    <Sheet
      visible={player != null}
      onClose={close}
      title={RENAME_UNCLAIMED_PLAYER_ACTION}
      subtitle={RENAME_UNCLAIMED_PLAYER_DESCRIPTION}
      keyboardShouldPersistTaps="handled"
      footer={
        <View style={{ gap: 8 }}>
          <FieldError message={rename.error?.message} />
          <Button
            label="Save name"
            size="lg"
            pending={rename.isPending}
            disabled={!canSubmit}
            onPress={() => {
              if (player && canSubmit) {
                rename.mutate({ userId: player.userId, name: name.trim() });
              }
            }}
          />
        </View>
      }
    >
      <TextField
        label={ADD_PLAYER_NAME_LABEL}
        value={name}
        maxLength={UNCLAIMED_PLAYER_NAME_MAX_LENGTH}
        autoCapitalize="words"
        autoComplete="off"
        editable={!rename.isPending}
        onChangeText={setName}
      />
    </Sheet>
  );
}

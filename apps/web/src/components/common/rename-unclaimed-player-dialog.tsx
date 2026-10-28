"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  ADD_PLAYER_NAME_LABEL,
  RENAME_UNCLAIMED_PLAYER_ACTION,
  RENAME_UNCLAIMED_PLAYER_DESCRIPTION,
  UNCLAIMED_PLAYER_NAME_MAX_LENGTH,
  renameUnclaimedPlayerCanSubmit,
  renameUnclaimedPlayerToast,
} from "@repo/domain/add-player-by-phone";
import { api } from "~/trpc/react";

const NAME_ID = "rename-unclaimed-player-name";

type Player = { userId: string; name: string };

function RenameForm({
  player,
  onDone,
}: {
  player: Player;
  onDone: () => void;
}) {
  const [name, setName] = React.useState(player.name);
  const utils = api.useUtils();
  const rename = api.users.renameUnclaimedPlayer.useMutation({
    onSuccess: async (result) => {
      toast.success(renameUnclaimedPlayerToast(result.name));
      await Promise.all([
        utils.games.byId.invalidate(),
        utils.games.footballBoard.invalidate(),
        utils.groups.byId.invalidate(),
        utils.users.playerProfile.invalidate(),
      ]);
      onDone();
    },
  });
  const canSubmit =
    !rename.isPending &&
    renameUnclaimedPlayerCanSubmit({ current: player.name, next: name });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) {
          rename.mutate({ userId: player.userId, name: name.trim() });
        }
      }}
      className="space-y-6 px-4 pb-4 md:px-0 md:pb-0"
    >
      <Field>
        <FieldLabel htmlFor={NAME_ID}>{ADD_PLAYER_NAME_LABEL}</FieldLabel>
        <Input
          id={NAME_ID}
          value={name}
          maxLength={UNCLAIMED_PLAYER_NAME_MAX_LENGTH}
          autoComplete="off"
          disabled={rename.isPending}
          onChange={(event) => setName(event.target.value)}
        />
        {rename.error ? <FieldError>{rename.error.message}</FieldError> : null}
      </Field>
      <Button
        type="submit"
        size="lg"
        className="w-full font-semibold"
        disabled={!canSubmit}
      >
        {rename.isPending ? "Saving…" : "Save name"}
      </Button>
    </form>
  );
}

export function RenameUnclaimedPlayerDialog({
  player,
  onClose,
}: {
  player: Player | null;
  onClose: () => void;
}) {
  return (
    <ResponsiveDialog
      open={player != null}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {RENAME_UNCLAIMED_PLAYER_ACTION}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {RENAME_UNCLAIMED_PLAYER_DESCRIPTION}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        {player ? (
          <RenameForm key={player.userId} player={player} onDone={onClose} />
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

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
import { AddPlayerIdentityFields } from "~/components/games/add-player-identity-fields";
import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import {
  ADD_GROUP_PLAYER_DESCRIPTION,
  ADD_PLAYER_ACTION,
  ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
  ADD_PLAYER_DEFAULT_LEVEL,
  addGroupPlayerCanSubmit,
  addGroupPlayerDoneToast,
  addGroupPlayerPreviewLine,
  addPlayerCompletePhone,
  type AddPlayerLevel,
} from "@repo/domain/add-player-by-phone";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";
import { DEFAULT_CALLING_COUNTRY_ISO } from "@repo/domain/phone-number";
import { api } from "~/trpc/react";

export function GroupAddPlayerDialog({
  open,
  onOpenChange,
  groupId,
  isFootball,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  isFootball: boolean;
  onDone: () => Promise<unknown>;
}) {
  const [countryIso, setCountryIso] = React.useState(
    DEFAULT_CALLING_COUNTRY_ISO,
  );
  const [national, setNational] = React.useState("");
  const [name, setName] = React.useState("");
  const [level, setLevel] = React.useState<AddPlayerLevel>(
    ADD_PLAYER_DEFAULT_LEVEL,
  );
  const [footballLevel, setFootballLevel] =
    React.useState<FootballSelfPlacement>(ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL);

  const utils = api.useUtils();
  const completePhone = addPlayerCompletePhone(countryIso, national);
  const preview = api.groups.previewPlayerByPhone.useQuery(
    { groupId, countryIso, nationalNumber: national },
    { enabled: open && completePhone != null, retry: false },
  );
  const previewData = completePhone ? (preview.data ?? null) : null;

  const add = api.groups.addPlayerByPhone.useMutation({
    onSuccess: async (result) => {
      toast.success(addGroupPlayerDoneToast(result));
      setNational("");
      setName("");
      setLevel(ADD_PLAYER_DEFAULT_LEVEL);
      setFootballLevel(ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL);
      await Promise.all([
        utils.groups.previewPlayerByPhone.invalidate({ groupId }),
        onDone(),
      ]);
    },
  });

  const canSubmit =
    !add.isPending && addGroupPlayerCanSubmit({ preview: previewData, name });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    const isNewPlayer = previewData?.kind === "new";
    add.mutate({
      groupId,
      countryIso,
      nationalNumber: national,
      name: isNewPlayer ? name.trim() : undefined,
      level: isNewPlayer ? (isFootball ? footballLevel : level) : undefined,
    });
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          add.reset();
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{ADD_PLAYER_ACTION}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {ADD_GROUP_PLAYER_DESCRIPTION}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          onSubmit={submit}
          className="max-h-[70vh] space-y-6 overflow-y-auto px-4 pb-4 md:max-h-none md:overflow-visible md:px-0 md:pb-0"
        >
          <AddPlayerIdentityFields
            countryIso={countryIso}
            national={national}
            onCountryIsoChange={setCountryIso}
            onNationalChange={setNational}
            complete={completePhone != null}
            preview={
              previewData
                ? {
                    line: addGroupPlayerPreviewLine(previewData),
                    kind: previewData.kind,
                    phoneMasked: previewData.phoneMasked,
                  }
                : null
            }
            previewError={preview.error?.message ?? null}
            previewFetching={preview.isFetching}
            name={name}
            onNameChange={setName}
            isFootball={isFootball}
            level={level}
            onLevelChange={setLevel}
            footballLevel={footballLevel}
            onFootballLevelChange={setFootballLevel}
            disabled={add.isPending}
          />

          {add.error ? <FieldError>{add.error.message}</FieldError> : null}

          <Button
            type="submit"
            size="lg"
            className="w-full font-semibold"
            disabled={!canSubmit}
          >
            {add.isPending ? "Adding…" : ADD_PLAYER_ACTION}
          </Button>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

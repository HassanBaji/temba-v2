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
import {
  Group,
  SectionLabel,
  TileChoices,
} from "~/components/onboarding/onboarding-choices";
import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import {
  ADD_PLAYER_ACTION,
  ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
  ADD_PLAYER_DEFAULT_FOOTBALL_POSITION,
  ADD_PLAYER_DEFAULT_FOOTBALL_ROLE,
  ADD_PLAYER_DEFAULT_LEVEL,
  ADD_PLAYER_DESCRIPTION,
  ADD_PLAYER_FOOTBALL_POSITION_CHOICES,
  ADD_PLAYER_FOOTBALL_ROLE_CHOICES,
  ADD_PLAYER_NO_SEAT_COPY,
  ADD_PLAYER_NO_SIDE_COPY,
  addPlayerAddedToast,
  addPlayerCanSubmit,
  addPlayerCompletePhone,
  addPlayerFootballInput,
  addPlayerPreviewLine,
  addPlayerSeatChoices,
  addPlayerSideChoices,
  sameJoinSeat,
  type AddPlayerFootballPosition,
  type AddPlayerLevel,
  type AddPlayerPlacement,
} from "@repo/domain/add-player-by-phone";
import type { FootballRole } from "@repo/domain/football-lineup";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";
import type { FriendlyGameJoinSeat } from "@repo/domain/friendly-game-cta";
import { DEFAULT_CALLING_COUNTRY_ISO } from "@repo/domain/phone-number";
import { api } from "~/trpc/react";

function seatKey(seat: FriendlyGameJoinSeat) {
  return `${seat.sideIndex}:${seat.position}`;
}

type NamedSeat = { name: string } | null;

export function AddPlayerDialog({
  open,
  onOpenChange,
  gameId,
  placement,
  sides,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  placement: AddPlayerPlacement;
  sides: readonly { sideIndex: number; left: NamedSeat; right: NamedSeat }[];
  onAdded: () => Promise<unknown>;
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
  const [role, setRole] = React.useState<FootballRole>(
    ADD_PLAYER_DEFAULT_FOOTBALL_ROLE,
  );
  const [footballPosition, setFootballPosition] =
    React.useState<AddPlayerFootballPosition>(
      ADD_PLAYER_DEFAULT_FOOTBALL_POSITION,
    );
  const [picked, setPicked] = React.useState<FriendlyGameJoinSeat | null>(null);
  const [pickedSide, setPickedSide] = React.useState<number | null>(null);

  const isFootball = placement === "football";
  const seatChoices = placement === "seat" ? addPlayerSeatChoices(sides) : [];
  const seat =
    seatChoices.find((choice) => sameJoinSeat(choice.seat, picked))?.seat ??
    seatChoices[0]?.seat ??
    null;
  const sideChoices = placement === "side" ? addPlayerSideChoices(sides) : [];
  const side =
    sideChoices.find((choice) => choice.sideIndex === pickedSide) ??
    sideChoices[0] ??
    null;
  const placed =
    placement === "seat"
      ? seat != null
      : placement === "side"
        ? side != null
        : true;
  const utils = api.useUtils();
  const completePhone = addPlayerCompletePhone(countryIso, national);
  const preview = api.games.previewPlayerByPhone.useQuery(
    { gameId, countryIso, nationalNumber: national },
    { enabled: open && completePhone != null, retry: false },
  );
  const previewData = completePhone ? (preview.data ?? null) : null;

  const add = api.games.addPlayerByPhone.useMutation({
    onSuccess: async (result) => {
      toast.success(addPlayerAddedToast(result.name));
      setNational("");
      setName("");
      setLevel(ADD_PLAYER_DEFAULT_LEVEL);
      setFootballLevel(ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL);
      setRole(ADD_PLAYER_DEFAULT_FOOTBALL_ROLE);
      setFootballPosition(ADD_PLAYER_DEFAULT_FOOTBALL_POSITION);
      setPicked(null);
      await Promise.all([
        utils.games.previewPlayerByPhone.invalidate({ gameId }),
        onAdded(),
      ]);
    },
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!addPlayerCanSubmit({ preview: previewData, name, placed })) {
      return;
    }
    const isNewPlayer = previewData?.kind === "new";
    add.mutate({
      gameId,
      countryIso,
      nationalNumber: national,
      name: isNewPlayer ? name.trim() : undefined,
      level: isNewPlayer ? (isFootball ? footballLevel : level) : undefined,
      seat: seat ?? undefined,
      side: side ? { sideIndex: side.sideIndex } : undefined,
      football: isFootball
        ? addPlayerFootballInput(role, footballPosition)
        : undefined,
    });
  }

  const canSubmit =
    !add.isPending &&
    addPlayerCanSubmit({ preview: previewData, name, placed });

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
            {ADD_PLAYER_DESCRIPTION}
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
                    line: addPlayerPreviewLine(previewData),
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

          {isFootball ? (
            <>
              <Group>
                <SectionLabel label="Plays as" />
                <TileChoices
                  label="Plays as"
                  choices={ADD_PLAYER_FOOTBALL_ROLE_CHOICES}
                  value={role}
                  onSelect={setRole}
                />
              </Group>
              {role === "outfield" ? (
                <Group>
                  <SectionLabel label="Preferred position" />
                  <TileChoices
                    label="Preferred position"
                    choices={ADD_PLAYER_FOOTBALL_POSITION_CHOICES}
                    value={footballPosition}
                    onSelect={setFootballPosition}
                  />
                </Group>
              ) : null}
            </>
          ) : null}

          {placement === "side" ? (
            side ? (
              <Group>
                <SectionLabel label="Side" />
                <TileChoices
                  label="Side"
                  choices={sideChoices.map((choice) => ({
                    value: String(choice.sideIndex),
                    name: choice.team,
                    detail: choice.detail,
                  }))}
                  value={String(side.sideIndex)}
                  onSelect={(key) => setPickedSide(Number(key))}
                />
              </Group>
            ) : (
              <p className="text-muted-foreground text-meta">
                {ADD_PLAYER_NO_SIDE_COPY}
              </p>
            )
          ) : null}

          {placement !== "seat" ? null : seat ? (
            <Group>
              <SectionLabel label="Position" />
              <TileChoices
                label="Position"
                choices={seatChoices.map((choice) => ({
                  value: seatKey(choice.seat),
                  name: choice.side,
                  detail: choice.team,
                }))}
                value={seatKey(seat)}
                onSelect={(key) =>
                  setPicked(
                    seatChoices.find((choice) => seatKey(choice.seat) === key)
                      ?.seat ?? null,
                  )
                }
              />
            </Group>
          ) : (
            <p className="text-muted-foreground text-meta">
              {ADD_PLAYER_NO_SEAT_COPY}
            </p>
          )}

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

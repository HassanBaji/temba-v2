"use client";

import { Phone, Users } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { GroupMemberList } from "~/components/games/add-player-group-list";
import { AddPlayerIdentityFields } from "~/components/games/add-player-identity-fields";
import {
  Group,
  SectionLabel,
  TileChoices,
} from "~/components/onboarding/onboarding-choices";
import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
  ADD_PLAYER_DEFAULT_FOOTBALL_POSITION,
  ADD_PLAYER_DEFAULT_FOOTBALL_ROLE,
  ADD_PLAYER_DEFAULT_LEVEL,
  addPlayerAddedToast,
  addPlayerCanSubmit,
  addPlayerCompletePhone,
  addPlayerFootballInput,
  addPlayerFootballPositionChoices,
  addPlayerFootballRoleChoices,
  addPlayerPreviewLine,
  addPlayerSeatChoices,
  addPlayerSideChoices,
  sameJoinSeat,
  type AddPlayerFootballPosition,
  type AddPlayerLevel,
  type AddPlayerPlacement,
} from "@repo/domain/add-player-by-phone";
import {
  groupAddActionLabel,
  groupAddedToast,
  groupMemberFootballDefaults,
  groupMemberRows,
  groupNoMatchLine,
  groupPickedNames,
  groupSpotsLine,
  toggleGroupMemberPick,
  type AddPlayerMode,
  type GroupMemberFootballPick,
} from "@repo/domain/add-player-from-group";
import type { FootballRole } from "@repo/domain/football-lineup";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";
import type { FriendlyGameJoinSeat } from "@repo/domain/friendly-game-cta";
import { DEFAULT_CALLING_COUNTRY_ISO } from "@repo/domain/phone-number";
import { useLocale, useMessages } from "~/components/locale-provider";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

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
  initialSeat = null,
  initialSide = null,
  groupName,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameId: string;
  placement: AddPlayerPlacement;
  sides: readonly { sideIndex: number; left: NamedSeat; right: NamedSeat }[];
  /** The open spot the Organizer clicked on the court. */
  initialSeat?: FriendlyGameJoinSeat | null;
  /** The open tournament team the Organizer clicked. */
  initialSide?: number | null;
  /** The Game's Group; with one, the dialog opens on its members. */
  groupName: string | null;
  onAdded: () => Promise<unknown>;
}) {
  const locale = useLocale();
  const m = useMessages();
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
  const hasGroup = groupName != null;
  const [mode, setMode] = React.useState<AddPlayerMode>(
    hasGroup ? "group" : "phone",
  );
  const [query, setQuery] = React.useState("");
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  const [footballPicks, setFootballPicks] = React.useState<
    Record<string, GroupMemberFootballPick>
  >({});

  React.useEffect(() => {
    if (open) {
      setPicked(initialSeat);
      setPickedSide(initialSide);
      setMode(hasGroup ? "group" : "phone");
      setQuery("");
      setMemberIds([]);
      setFootballPicks({});
    }
  }, [open, initialSeat, initialSide, hasGroup]);

  const isFootball = placement === "football";
  const inGroupMode = hasGroup && mode === "group";
  const seatChoices =
    placement === "seat" ? addPlayerSeatChoices(sides, locale) : [];
  const seat =
    seatChoices.find((choice) => sameJoinSeat(choice.seat, picked))?.seat ??
    seatChoices[0]?.seat ??
    null;
  const sideChoices =
    placement === "side" ? addPlayerSideChoices(sides, locale) : [];
  const side =
    sideChoices.find((choice) => choice.sideIndex === pickedSide) ??
    sideChoices[0] ??
    null;
  const tappedSide =
    sideChoices.find((choice) => choice.sideIndex === pickedSide) ?? null;
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
    meta: OWN_ERROR_UI,
    onSuccess: async (result) => {
      toast.success(addPlayerAddedToast(result.name, locale));
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

  const groupMembers = api.games.listGroupMembersToAdd.useQuery(
    { gameId },
    { enabled: open && hasGroup },
  );
  const roster = groupMembers.data ?? null;
  const openSpots = roster?.openSpots ?? 0;
  const memberRows = roster
    ? groupMemberRows(
        {
          members: roster.members,
          query,
          picked: memberIds,
          openSpots,
          isFootball,
        },
        locale,
      )
    : [];

  const addMembers = api.games.addGroupMembers.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async (result) => {
      toast.success(groupAddedToast(result.added, locale));
      setMemberIds([]);
      setFootballPicks({});
      setPicked(null);
      setPickedSide(null);
      await Promise.all([
        utils.games.listGroupMembersToAdd.invalidate({ gameId }),
        utils.games.previewPlayerByPhone.invalidate({ gameId }),
        onAdded(),
      ]);
    },
  });

  function toggleMember(userId: string) {
    const next = toggleGroupMemberPick(memberIds, userId, openSpots);
    setMemberIds(next);
    const member = roster?.members.find((entry) => entry.userId === userId);
    if (next.includes(userId) && member && !footballPicks[userId]) {
      setFootballPicks((current) => ({
        ...current,
        [userId]: groupMemberFootballDefaults(member),
      }));
    }
  }

  function submitMembers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (memberIds.length === 0 || addMembers.isPending) {
      return;
    }
    addMembers.mutate({
      gameId,
      players: memberIds.map((userId) => {
        const pick = footballPicks[userId];
        return {
          userId,
          football:
            isFootball && pick
              ? addPlayerFootballInput(pick.role, pick.position)
              : undefined,
        };
      }),
      seat: placement === "seat" ? (picked ?? undefined) : undefined,
      side: tappedSide ? { sideIndex: tappedSide.sideIndex } : undefined,
    });
  }

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
    !addMembers.isPending &&
    addPlayerCanSubmit({ preview: previewData, name, placed });
  const pickedNames = roster
    ? groupPickedNames(roster.members, memberIds, locale)
    : "";
  const formClass =
    "max-h-[70vh] space-y-6 overflow-y-auto px-4 pb-4 md:max-h-none md:overflow-visible md:px-0 md:pb-0";

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          add.reset();
          addMembers.reset();
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {m.group.addPlayer.action}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {inGroupMode
              ? m.group.addPlayer.fromGroup.description
              : m.group.addPlayer.description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {hasGroup ? (
          <Tabs
            value={mode}
            onValueChange={(next) => setMode(next as AddPlayerMode)}
            className="px-4 pb-4 md:px-0 md:pb-0"
          >
            <TabsList
              aria-label={m.group.addPlayer.fromGroup.modes}
              className="bg-wash h-auto w-full gap-1 p-1"
            >
              <TabsTrigger
                value="group"
                className="text-muted-foreground text-meta data-[state=active]:bg-paper data-[state=active]:text-ink h-[38px] gap-1.5 border-none font-semibold"
              >
                <Users className="size-3.5" aria-hidden="true" />
                {m.group.addPlayer.fromGroup.tab}
              </TabsTrigger>
              <TabsTrigger
                value="phone"
                className="text-muted-foreground text-meta data-[state=active]:bg-paper data-[state=active]:text-ink h-[38px] gap-1.5 border-none font-semibold"
              >
                <Phone className="size-3.5" aria-hidden="true" />
                {m.group.addPlayer.fromGroup.phoneTab}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}

        {inGroupMode ? (
          <form onSubmit={submitMembers} className={formClass}>
            <GroupMemberList
              query={query}
              onQueryChange={setQuery}
              groupLine={
                roster
                  ? m.group.addPlayer.fromGroup.groupLine(
                      roster.groupName,
                      roster.members.length,
                    )
                  : null
              }
              spotsLine={
                roster
                  ? groupSpotsLine(openSpots, memberIds.length, locale)
                  : null
              }
              full={roster != null && memberIds.length >= openSpots}
              rows={memberRows}
              detailsById={
                new Map(
                  (roster?.members ?? []).map((member) => [
                    member.userId,
                    { unclaimed: member.unclaimed, image: member.image },
                  ]),
                )
              }
              footballById={isFootball ? footballPicks : null}
              emptyLine={
                roster && memberRows.length === 0 && query.trim()
                  ? groupNoMatchLine(query, locale)
                  : null
              }
              loading={groupMembers.isPending}
              error={groupMembers.error?.message ?? null}
              onToggle={toggleMember}
              onFootballChange={(userId, pick) =>
                setFootballPicks((current) => ({ ...current, [userId]: pick }))
              }
              disabled={addMembers.isPending}
            />

            <div className="border-rule space-y-2.5 border-t pt-3.5">
              {addMembers.error ? (
                <FieldError>{addMembers.error.message}</FieldError>
              ) : null}
              {tappedSide ? (
                <p className="text-meta text-muted-foreground">
                  {m.editTeams.openSpot.firstGoesTo(tappedSide.team)}
                </p>
              ) : null}
              {pickedNames ? (
                <p className="text-meta text-muted-foreground truncate">
                  {pickedNames}
                </p>
              ) : null}
              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold"
                pending={addMembers.isPending}
                disabled={memberIds.length === 0 || add.isPending}
              >
                {groupAddActionLabel(memberIds.length, locale)}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={submit} className={formClass}>
            <AddPlayerIdentityFields
              countryIso={countryIso}
              national={national}
              onCountryIsoChange={setCountryIso}
              onNationalChange={setNational}
              complete={completePhone != null}
              preview={
                previewData
                  ? {
                      line: addPlayerPreviewLine(previewData, locale),
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
                  <SectionLabel label={m.webGame.addPlayer.playsAs} />
                  <TileChoices
                    label={m.webGame.addPlayer.playsAs}
                    choices={addPlayerFootballRoleChoices(locale)}
                    value={role}
                    onSelect={setRole}
                  />
                </Group>
                {role === "outfield" ? (
                  <Group>
                    <SectionLabel
                      label={m.webGame.addPlayer.preferredPosition}
                    />
                    <TileChoices
                      label={m.webGame.addPlayer.preferredPosition}
                      choices={addPlayerFootballPositionChoices(locale)}
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
                  <SectionLabel label={m.webGame.addPlayer.side} />
                  <TileChoices
                    label={m.webGame.addPlayer.side}
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
                  {m.group.addPlayer.noSide}
                </p>
              )
            ) : null}

            {placement !== "seat" ? null : seat ? (
              <Group>
                <SectionLabel label={m.webGame.addPlayer.position} />
                <TileChoices
                  label={m.webGame.addPlayer.position}
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
                {m.group.addPlayer.noSeat}
              </p>
            )}

            {add.error ? <FieldError>{add.error.message}</FieldError> : null}

            <Button
              type="submit"
              size="lg"
              className="w-full font-semibold"
              disabled={!canSubmit}
            >
              {add.isPending
                ? m.webGame.addPlayer.adding
                : m.group.addPlayer.addToGame}
            </Button>
          </form>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

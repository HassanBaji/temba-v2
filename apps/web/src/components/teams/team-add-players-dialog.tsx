"use client";

import { Search } from "lucide-react";
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
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  Group,
  SectionLabel,
  TileChoices,
} from "~/components/onboarding/onboarding-choices";
import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
  ADD_PLAYER_DEFAULT_FOOTBALL_POSITION,
  ADD_PLAYER_DEFAULT_FOOTBALL_ROLE,
  ADD_PLAYER_DEFAULT_LEVEL,
  addGroupPlayerDoneToast,
  addPlayerCompletePhone,
  addPlayerFootballInput,
  addPlayerFootballPositionChoices,
  addPlayerFootballRoleChoices,
  type AddPlayerFootballPosition,
  type AddPlayerLevel,
} from "@repo/domain/add-player-by-phone";
import { groupNoMatchLine } from "@repo/domain/add-player-from-group";
import type { FootballRole } from "@repo/domain/football-lineup";
import type { FootballSelfPlacement } from "@repo/domain/football-self-placement";
import { DEFAULT_CALLING_COUNTRY_ISO } from "@repo/domain/phone-number";
import type { Sport } from "@repo/domain/sport";
import {
  teamAddPlayersSpotsLine,
  teamGroupAddLabel,
  teamGroupMemberRows,
  teamPhoneCanSubmit,
  teamPhonePreviewLine,
  toggleTeamGroupPick,
  type TeamRosterDraftInvite,
  type TeamRosterDraftPhone,
} from "@repo/domain/team-roster-draft";
import { api } from "~/trpc/react";

type AddTab = "phone" | "temba" | "group";

const TABS: readonly AddTab[] = ["phone", "temba", "group"];
const SEARCH_MIN_LENGTH = 2;
const TRIGGER_CLASS =
  "text-muted-foreground text-meta data-[state=active]:bg-paper data-[state=active]:text-ink h-[38px] flex-1 border-none font-semibold";
const BODY_CLASS =
  "max-h-[70vh] space-y-6 overflow-y-auto px-4 pb-4 md:max-h-none md:overflow-visible md:px-0 md:pb-0";

/**
 * Before the Team exists the dialog only fills the New team draft; on a Team
 * it adds through the Team's own doors.
 */
export type TeamAddPlayersTarget =
  | {
      kind: "draft";
      listedUserIds: readonly string[];
      listedPhones: readonly string[];
      onAddPhone: (phone: TeamRosterDraftPhone) => void;
      onAddInvites: (invites: TeamRosterDraftInvite[]) => void;
    }
  | { kind: "team"; teamId: string; onChanged: () => Promise<unknown> };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function TeamAddPlayersDialog({
  open,
  onOpenChange,
  sport,
  spotsLeft,
  groups,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sport: Sport;
  spotsLeft: number;
  /** Groups of the Team's sport the viewer organizes, for From a group. */
  groups: readonly { id: string; name: string | null }[];
  target: TeamAddPlayersTarget;
}) {
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const isFootball = sport === "football";
  const teamId = target.kind === "team" ? target.teamId : undefined;

  const [tab, setTab] = React.useState<AddTab>("phone");
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
  const [position, setPosition] = React.useState<AddPlayerFootballPosition>(
    ADD_PLAYER_DEFAULT_FOOTBALL_POSITION,
  );
  const [query, setQuery] = React.useState("");
  const [groupQuery, setGroupQuery] = React.useState("");
  const [groupId, setGroupId] = React.useState<string | null>(null);
  const [picked, setPicked] = React.useState<string[]>([]);
  const [groupError, setGroupError] = React.useState<string | null>(null);
  const [groupPending, setGroupPending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTab("phone");
      setQuery("");
      setGroupQuery("");
      setPicked([]);
      setGroupError(null);
    }
  }, [open]);

  const activeGroupId = groupId ?? groups[0]?.id ?? null;
  const listedUserIds = target.kind === "draft" ? target.listedUserIds : [];

  function resetPhone() {
    setNational("");
    setName("");
    setLevel(ADD_PLAYER_DEFAULT_LEVEL);
    setFootballLevel(ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL);
    setRole(ADD_PLAYER_DEFAULT_FOOTBALL_ROLE);
    setPosition(ADD_PLAYER_DEFAULT_FOOTBALL_POSITION);
  }

  const completePhone = addPlayerCompletePhone(countryIso, national);
  const preview = api.teams.previewPlayerByPhone.useQuery(
    { teamId, countryIso, nationalNumber: national },
    { enabled: open && completePhone != null, retry: false },
  );
  const previewData = completePhone ? (preview.data ?? null) : null;
  const listedPhone =
    target.kind === "draft" && completePhone != null
      ? target.listedPhones.includes(completePhone)
      : false;
  const isNew = previewData?.kind === "new";

  const addByPhone = api.teams.addPlayerByPhone.useMutation({
    onSuccess: async (result) => {
      toast.success(addGroupPlayerDoneToast(result, locale));
      resetPhone();
      await Promise.all([
        utils.teams.previewPlayerByPhone.invalidate(),
        target.kind === "team" ? target.onChanged() : null,
      ]);
    },
  });

  const search = api.teams.searchLookupUsers.useQuery(
    { teamId, query: query.trim() },
    {
      enabled:
        open && tab === "temba" && query.trim().length >= SEARCH_MIN_LENGTH,
    },
  );
  const inviteInApp = api.teams.inviteInApp.useMutation();

  const groupMembers = api.teams.listGroupMembersToAdd.useQuery(
    { groupId: activeGroupId ?? "", teamId },
    { enabled: open && tab === "group" && activeGroupId != null },
  );

  const pending = addByPhone.isPending || inviteInApp.isPending || groupPending;
  const canSubmitPhone =
    !pending &&
    spotsLeft > 0 &&
    teamPhoneCanSubmit({ preview: previewData, listed: listedPhone, name });

  function submitPhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmitPhone || !previewData || completePhone == null) {
      return;
    }
    const football =
      isFootball && isNew ? addPlayerFootballInput(role, position) : undefined;
    const pickedLevel = isNew
      ? isFootball
        ? footballLevel
        : level
      : undefined;
    if (target.kind === "draft") {
      const listedName = isNew ? name.trim() : (previewData.name ?? "");
      target.onAddPhone({
        e164: completePhone,
        countryIso,
        nationalNumber: national,
        name: listedName,
        kind: previewData.kind,
        phoneMasked: previewData.phoneMasked,
        level: pickedLevel,
        football,
      });
      toast.success(m.team.addPlayers.listed(listedName));
      resetPhone();
      return;
    }
    addByPhone.mutate({
      teamId: target.teamId,
      countryIso,
      nationalNumber: national,
      name: isNew ? name.trim() : undefined,
      level: pickedLevel,
      football,
    });
  }

  async function invite(user: { id: string; name: string }) {
    if (target.kind === "draft") {
      target.onAddInvites([{ userId: user.id, name: user.name }]);
      toast.success(m.team.addPlayers.listed(user.name));
      return;
    }
    try {
      await inviteInApp.mutateAsync({ teamId: target.teamId, userId: user.id });
      toast.success(m.group.addPlayer.inviteSentToast(user.name));
      await Promise.all([
        utils.teams.searchLookupUsers.invalidate(),
        target.onChanged(),
      ]);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  const members = groupMembers.data?.members ?? [];
  const rows = teamGroupMemberRows(
    { members, query: groupQuery, picked, listedUserIds, spotsLeft, sport },
    locale,
  );

  async function submitGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = members.filter((member) => picked.includes(member.userId));
    if (chosen.length === 0 || pending) {
      return;
    }
    setGroupError(null);
    if (target.kind === "draft") {
      target.onAddInvites(
        chosen.map((member) => ({ userId: member.userId, name: member.name })),
      );
      toast.success(m.team.addPlayers.listedCount(chosen.length));
      setPicked([]);
      return;
    }
    setGroupPending(true);
    let sent = 0;
    try {
      for (const member of chosen) {
        await inviteInApp.mutateAsync({
          teamId: target.teamId,
          userId: member.userId,
        });
        sent += 1;
      }
    } catch (error) {
      setGroupError(errorMessage(error));
    } finally {
      setGroupPending(false);
      setPicked([]);
      if (sent > 0) {
        toast.success(m.team.addPlayers.invitesSent(sent));
      }
      await Promise.all([
        utils.teams.listGroupMembersToAdd.invalidate(),
        target.onChanged(),
      ]);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          addByPhone.reset();
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {m.team.addPlayers.title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {m.team.addPlayers.description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-2 px-4 md:px-0">
          <Tabs value={tab} onValueChange={(next) => setTab(next as AddTab)}>
            <TabsList
              aria-label={m.team.addPlayers.tabs.label}
              className="bg-wash h-auto w-full gap-1 p-1"
            >
              {TABS.map((entry) => (
                <TabsTrigger
                  key={entry}
                  value={entry}
                  className={TRIGGER_CLASS}
                >
                  {m.team.addPlayers.tabs[entry]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-meta text-muted-foreground" aria-live="polite">
            {teamAddPlayersSpotsLine(spotsLeft, locale)}
          </p>
        </div>

        {tab === "phone" ? (
          <form onSubmit={submitPhone} className={BODY_CLASS}>
            <AddPlayerIdentityFields
              countryIso={countryIso}
              national={national}
              onCountryIsoChange={setCountryIso}
              onNationalChange={setNational}
              complete={completePhone != null}
              preview={
                previewData
                  ? {
                      line: teamPhonePreviewLine(
                        previewData,
                        { listed: listedPhone },
                        locale,
                      ),
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
              disabled={pending}
            />
            {isFootball && isNew ? (
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
                      value={position}
                      onSelect={setPosition}
                    />
                  </Group>
                ) : null}
              </>
            ) : null}
            {addByPhone.error ? (
              <FieldError>{addByPhone.error.message}</FieldError>
            ) : null}
            <Button
              type="submit"
              size="lg"
              className="w-full font-semibold"
              pending={addByPhone.isPending}
              disabled={!canSubmitPhone}
            >
              {m.team.addPlayers.addToRoster}
            </Button>
          </form>
        ) : null}

        {tab === "temba" ? (
          <div className={BODY_CLASS}>
            <InputGroup className="h-11">
              <InputGroupAddon>
                <Search aria-hidden="true" />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={m.team.addPlayers.searchLabel}
                aria-label={m.team.addPlayers.searchLabel}
                autoComplete="off"
              />
            </InputGroup>
            {search.error ? (
              <p role="alert" className="text-meta font-medium">
                {search.error.message}
              </p>
            ) : null}
            {search.data?.length === 0 ? (
              <p className="text-meta text-muted-foreground">
                {m.team.addPlayers.searchEmpty}
              </p>
            ) : null}
            <ul className="divide-rule divide-y">
              {(search.data ?? []).map((row) => (
                <li key={row.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{row.name}</p>
                    {row.username ? (
                      <p className="text-meta text-muted-foreground truncate">
                        {row.username}
                      </p>
                    ) : null}
                  </div>
                  {listedUserIds.includes(row.id) ? (
                    <span className="text-eyebrow text-muted-foreground">
                      {m.team.addPlayers.invitedMark}
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`${m.team.addPlayers.invite}${m.group.metaSeparator}${row.name}`}
                      disabled={pending || spotsLeft === 0}
                      onClick={() => void invite(row)}
                    >
                      {m.team.addPlayers.invite}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {tab === "group" ? (
          groups.length === 0 ? (
            <p className="text-meta text-muted-foreground px-4 pb-4 md:px-0 md:pb-0">
              {m.team.addPlayers.noGroups}
            </p>
          ) : (
            <form onSubmit={submitGroup} className={BODY_CLASS}>
              {groups.length > 1 ? (
                <Group>
                  <SectionLabel label={m.team.addPlayers.groupLabel} />
                  <TileChoices
                    label={m.team.addPlayers.groupLabel}
                    choices={groups.map((group) => ({
                      value: group.id,
                      name: group.name ?? m.group.untitled,
                    }))}
                    value={activeGroupId ?? ""}
                    onSelect={(id) => {
                      setGroupId(id);
                      setPicked([]);
                    }}
                  />
                </Group>
              ) : null}
              {groupMembers.data && members.length === 0 ? (
                <p className="text-meta text-muted-foreground">
                  {m.team.addPlayers.groupEmpty}
                </p>
              ) : null}
              <GroupMemberList
                query={groupQuery}
                onQueryChange={setGroupQuery}
                groupLine={
                  groupMembers.data
                    ? m.group.addPlayer.fromGroup.groupLine(
                        groupMembers.data.groupName ?? m.group.untitled,
                        members.length,
                      )
                    : null
                }
                spotsLine={null}
                full={picked.length >= spotsLeft}
                rows={rows}
                detailsById={
                  new Map(
                    members.map((member) => [
                      member.userId,
                      { unclaimed: member.unclaimed, image: member.image },
                    ]),
                  )
                }
                footballById={null}
                emptyLine={
                  rows.length === 0 && groupQuery.trim()
                    ? groupNoMatchLine(groupQuery, locale)
                    : null
                }
                loading={groupMembers.isPending}
                error={groupMembers.error?.message ?? null}
                onToggle={(userId) =>
                  setPicked((current) =>
                    toggleTeamGroupPick(current, userId, spotsLeft),
                  )
                }
                onFootballChange={() => undefined}
                disabled={pending}
              />
              {groupError ? <FieldError>{groupError}</FieldError> : null}
              <Button
                type="submit"
                size="lg"
                className="w-full font-semibold"
                pending={groupPending}
                disabled={picked.length === 0 || pending}
              >
                {teamGroupAddLabel(picked.length, locale)}
              </Button>
            </form>
          )
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

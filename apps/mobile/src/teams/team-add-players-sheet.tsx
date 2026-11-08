import { radii, sizes, spacing } from "@repo/design-tokens";
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
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { TileChoices } from "../auth/onboarding-choices";
import { FieldError } from "../create-game/chips";
import { GroupMemberList } from "../game-details/add-player-group-list";
import {
  AddPlayerIdentityFields,
  AddPlayerSection,
} from "../game-details/add-player-identity-fields";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { SearchField } from "../primitives/search-field";
import { Sheet } from "../primitives/sheet";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { useColors } from "../theme/theme-provider";

type AddTab = "phone" | "temba" | "group";

const TABS: readonly AddTab[] = ["phone", "temba", "group"];
const SEGMENT_INSET = 4;
const SEGMENT_HEIGHT = 38;
const SEARCH_MIN_LENGTH = 2;

/**
 * Before the Team exists the sheet only fills the New team draft; on a Team
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

function TabSwitch({
  tab,
  onChange,
}: {
  tab: AddTab;
  onChange: (tab: AddTab) => void;
}) {
  const colors = useColors();
  const m = useMessages().team.addPlayers.tabs;
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={m.label}
      style={{
        flexDirection: "row",
        gap: SEGMENT_INSET,
        padding: SEGMENT_INSET,
        borderRadius: radii.lg,
        backgroundColor: colors.wash,
      }}
    >
      {TABS.map((entry) => {
        const selected = entry === tab;
        return (
          <Pressable
            key={entry}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(entry)}
            hitSlop={(sizes.touchTarget - SEGMENT_HEIGHT) / 2}
            style={{
              flex: 1,
              height: SEGMENT_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.md,
              backgroundColor: selected ? colors.paper : "transparent",
            }}
          >
            <Text
              size="meta"
              weight="semibold"
              tone={selected ? "default" : "muted"}
              numberOfLines={1}
            >
              {m[entry]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function TeamAddPlayersSheet({
  visible,
  onClose,
  sport,
  spotsLeft,
  groups,
  target,
}: {
  visible: boolean;
  onClose: () => void;
  sport: Sport;
  spotsLeft: number;
  /** Groups of the Team's sport the viewer organizes, for From a group. */
  groups: readonly { id: string; name: string | null }[];
  target: TeamAddPlayersTarget;
}) {
  const m = useMessages();
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const isFootball = sport === "football";
  const teamId = target.kind === "team" ? target.teamId : undefined;

  const [tab, setTab] = useState<AddTab>("phone");
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [name, setName] = useState("");
  const [level, setLevel] = useState<AddPlayerLevel>(ADD_PLAYER_DEFAULT_LEVEL);
  const [footballLevel, setFootballLevel] = useState<FootballSelfPlacement>(
    ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
  );
  const [role, setRole] = useState<FootballRole>(
    ADD_PLAYER_DEFAULT_FOOTBALL_ROLE,
  );
  const [position, setPosition] = useState<AddPlayerFootballPosition>(
    ADD_PLAYER_DEFAULT_FOOTBALL_POSITION,
  );
  const [query, setQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupPending, setGroupPending] = useState(false);

  useEffect(() => {
    if (visible) {
      setTab("phone");
      setQuery("");
      setGroupQuery("");
      setPicked([]);
      setGroupError(null);
    }
  }, [visible]);

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
    { enabled: visible && completePhone != null, retry: false },
  );
  const previewData = completePhone ? (preview.data ?? null) : null;
  const listedPhone =
    target.kind === "draft" && completePhone != null
      ? target.listedPhones.includes(completePhone)
      : false;
  const isNew = previewData?.kind === "new";

  const addByPhone = api.teams.addPlayerByPhone.useMutation({
    onSuccess: async (result) => {
      toast.show(addGroupPlayerDoneToast(result, locale));
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
        visible && tab === "temba" && query.trim().length >= SEARCH_MIN_LENGTH,
    },
  );
  const inviteInApp = api.teams.inviteInApp.useMutation();

  const groupMembers = api.teams.listGroupMembersToAdd.useQuery(
    { groupId: activeGroupId ?? "", teamId },
    { enabled: visible && tab === "group" && activeGroupId != null },
  );

  const pending = addByPhone.isPending || inviteInApp.isPending || groupPending;
  const canSubmitPhone =
    !pending &&
    spotsLeft > 0 &&
    teamPhoneCanSubmit({ preview: previewData, listed: listedPhone, name });

  function submitPhone() {
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
      target.onAddPhone({
        e164: completePhone,
        countryIso,
        nationalNumber: national,
        name: isNew ? name.trim() : (previewData.name ?? name.trim()),
        kind: previewData.kind,
        phoneMasked: previewData.phoneMasked,
        level: pickedLevel,
        football,
      });
      toast.show(
        m.team.addPlayers.listed(
          isNew ? name.trim() : (previewData.name ?? ""),
        ),
      );
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
      toast.show(m.team.addPlayers.listed(user.name));
      return;
    }
    try {
      await inviteInApp.mutateAsync({ teamId: target.teamId, userId: user.id });
      toast.show(m.group.addPlayer.inviteSentToast(user.name));
      await Promise.all([
        utils.teams.searchLookupUsers.invalidate(),
        target.onChanged(),
      ]);
    } catch (error) {
      toast.show(error instanceof Error ? error.message : String(error));
    }
  }

  const members = groupMembers.data?.members ?? [];
  const rows = teamGroupMemberRows(
    {
      members,
      query: groupQuery,
      picked,
      listedUserIds,
      spotsLeft,
      sport,
    },
    locale,
  );

  async function submitGroup() {
    const chosen = members.filter((member) => picked.includes(member.userId));
    if (chosen.length === 0 || pending) {
      return;
    }
    setGroupError(null);
    if (target.kind === "draft") {
      target.onAddInvites(
        chosen.map((member) => ({ userId: member.userId, name: member.name })),
      );
      toast.show(m.team.addPlayers.listedCount(chosen.length));
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
      setGroupError(error instanceof Error ? error.message : String(error));
    } finally {
      setGroupPending(false);
      setPicked([]);
      if (sent > 0) {
        toast.show(m.team.addPlayers.invitesSent(sent));
      }
      await Promise.all([
        utils.teams.listGroupMembersToAdd.invalidate(),
        target.onChanged(),
      ]);
    }
  }

  function close() {
    addByPhone.reset();
    onClose();
  }

  const footer =
    tab === "phone" ? (
      <View style={{ gap: 8 }}>
        <FieldError message={addByPhone.error?.message} />
        <Button
          label={m.team.addPlayers.addToRoster}
          size="lg"
          pending={addByPhone.isPending}
          disabled={!canSubmitPhone}
          onPress={submitPhone}
        />
      </View>
    ) : tab === "group" && groups.length > 0 ? (
      <View style={{ gap: 8 }}>
        <FieldError message={groupError ?? undefined} />
        <Button
          label={teamGroupAddLabel(picked.length, locale)}
          size="lg"
          pending={groupPending}
          disabled={picked.length === 0 || pending}
          onPress={() => void submitGroup()}
        />
      </View>
    ) : undefined;

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={m.team.addPlayers.title}
      subtitle={m.team.addPlayers.description}
      tall
      keyboardShouldPersistTaps="handled"
      footer={footer}
    >
      <TabSwitch tab={tab} onChange={setTab} />
      <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
        {teamAddPlayersSpotsLine(spotsLeft, locale)}
      </Text>

      {tab === "phone" ? (
        <>
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
            previewError={preview.error?.message}
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
              <AddPlayerSection label={m.mobileGameDetails.addPlayer.playsAs}>
                <TileChoices
                  label={m.mobileGameDetails.addPlayer.playsAs}
                  choices={addPlayerFootballRoleChoices(locale)}
                  value={role}
                  onSelect={setRole}
                  disabled={pending}
                />
              </AddPlayerSection>
              {role === "outfield" ? (
                <AddPlayerSection
                  label={m.mobileGameDetails.addPlayer.preferredPosition}
                >
                  <TileChoices
                    label={m.mobileGameDetails.addPlayer.preferredPosition}
                    choices={addPlayerFootballPositionChoices(locale)}
                    value={position}
                    onSelect={setPosition}
                    disabled={pending}
                  />
                </AddPlayerSection>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      {tab === "temba" ? (
        <View style={{ gap: 12 }}>
          <SearchField
            tone="wash"
            value={query}
            onChangeText={setQuery}
            placeholder={m.team.addPlayers.searchLabel}
            accessibilityLabel={m.team.addPlayers.searchLabel}
          />
          {search.error ? (
            <Text size="meta" tone="muted">
              {search.error.message}
            </Text>
          ) : null}
          {search.data?.length === 0 ? (
            <Text size="meta" tone="muted">
              {m.team.addPlayers.searchEmpty}
            </Text>
          ) : null}
          <View>
            {(search.data ?? []).map((row, index) => {
              const listed = listedUserIds.includes(row.id);
              return (
                <View key={row.id}>
                  {index > 0 ? <Hairline /> : null}
                  <View
                    style={{
                      minHeight: 56,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      paddingVertical: spacing.compact / 2,
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                      <Text weight="semibold" numberOfLines={1}>
                        {row.name}
                      </Text>
                      {row.username ? (
                        <Text size="meta" tone="muted" numberOfLines={1}>
                          {row.username}
                        </Text>
                      ) : null}
                    </View>
                    {listed ? (
                      <Text size="eyebrow" tone="muted">
                        {m.team.addPlayers.invitedMark}
                      </Text>
                    ) : (
                      <Button
                        label={m.team.addPlayers.invite}
                        accessibilityLabel={m.mobileHome.join.parts([
                          m.team.addPlayers.invite,
                          row.name,
                        ])}
                        variant="outline"
                        size="sm"
                        disabled={pending || spotsLeft === 0}
                        onPress={() => void invite(row)}
                      />
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {tab === "group" ? (
        groups.length === 0 ? (
          <Text size="meta" tone="muted">
            {m.team.addPlayers.noGroups}
          </Text>
        ) : (
          <View style={{ gap: 12 }}>
            {groups.length > 1 ? (
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
                disabled={pending}
              />
            ) : null}
            {groupMembers.data && members.length === 0 ? (
              <Text size="meta" tone="muted">
                {m.team.addPlayers.groupEmpty}
              </Text>
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
              error={groupMembers.error?.message}
              onToggle={(userId) =>
                setPicked((current) =>
                  toggleTeamGroupPick(current, userId, spotsLeft),
                )
              }
              onFootballChange={() => undefined}
              disabled={pending}
            />
          </View>
        )
      ) : null}
    </Sheet>
  );
}

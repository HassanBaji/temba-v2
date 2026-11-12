import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import {
  addDraftInvites,
  addDraftPhone,
  EMPTY_TEAM_ROSTER_DRAFT,
  removeDraftRow,
  rosterDraftCount,
  rosterDraftCreateInput,
  rosterDraftForSport,
  rosterDraftSpotsLeft,
  rosterDraftView,
  teamCreateSubmitLabel,
  toggleDraftGroupMember,
  type TeamRosterDraft,
} from "@repo/domain/team-roster-draft";
import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import type { PickedImage } from "../groups/group-image";
import { pickGroupImage } from "../groups/pick-group-image";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { useLeaveScreen } from "../primitives/screen-header";
import { Screen } from "../primitives/screen";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { CreateTeamFromGroup } from "./create-team-from-group";
import { CreateTeamHeader } from "./create-team-parts";
import { CreateTeamPhoneLookup } from "./create-team-phone-lookup";
import { CreateTeamTembaSearch } from "./create-team-temba-search";
import { CreateTeamView, type CreateTeamSource } from "./create-team-view";
import { TEAMS_PATH, teamPath } from "./teams-model";

const CANCEL_WIDTH = 104;

type Picked = { uri: string; upload: PickedImage & { ok: true } };

export function CreateTeamScreen({ groupId }: { groupId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const c = m.team.create;
  const locale = useLocale();
  const utils = api.useUtils();
  const leave = useLeaveScreen(TEAMS_PATH);

  const [mode, setMode] = useState<"form" | "group">(
    groupId ? "group" : "form",
  );
  const [pickedGroupId, setGroupId] = useState<string | null>(groupId);
  const [tagged, setTagged] = useState(true);
  const [name, setName] = useState("");
  const [pickedSport, setSport] = useState<Sport>(DEFAULT_SPORT);
  const [draft, setDraft] = useState<TeamRosterDraft>(EMPTY_TEAM_ROSTER_DRAFT);
  const [adderOpen, setAdderOpen] = useState(true);
  const [source, setSource] = useState<CreateTeamSource>("phone");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const me = api.users.profileDetails.useQuery();
  const organized = api.games.listCreateGroups.useQuery();
  const groups = organized.data ?? [];
  const group = groups.find((entry) => entry.id === pickedGroupId) ?? null;
  const sport = mode === "group" && group ? group.sport : pickedSport;
  const tagGroupId = tagged && group?.sport === sport ? group.id : null;

  const fitted = rosterDraftForSport(draft, sport);
  const count = rosterDraftCount(fitted);
  const full = rosterDraftSpotsLeft(fitted, sport) === 0;
  const captainName = me.data?.name ?? m.common.you;
  const roster = rosterDraftView(
    fitted,
    {
      sport,
      captain: {
        name: captainName,
        footballRole: me.data?.preferredFootballRole ?? null,
        footballPosition: me.data?.preferredFootballPosition ?? null,
      },
    },
    locale,
  );

  const uploadImage = api.teams.uploadImage.useMutation();

  async function uploadPickedImage(teamId: string) {
    if (!picked) {
      return true;
    }
    try {
      await uploadImage.mutateAsync({
        teamId,
        contentType: picked.upload.contentType,
        dataBase64: picked.upload.dataBase64,
      });
      return true;
    } catch {
      return false;
    }
  }

  const create = api.teams.create.useMutation({
    onSuccess: async (team) => {
      const imageSaved = await uploadPickedImage(team.id);
      toast.show(
        imageSaved ? m.team.toast.created : m.team.image.createdWithoutImage,
      );
      await utils.teams.mine.invalidate();
      if (team.groupTag) {
        await utils.groups.byId.invalidate({ id: team.groupTag.id });
      }
      router.replace(teamPath(team.id));
    },
    onError: (error) => {
      const split = splitTrpcFormError(error);
      setNameError(split.fieldErrors.name ?? null);
      if (split.fieldErrors.name) {
        setMode("form");
      }
      setFormError(
        split.globalMessage ?? (split.fieldErrors.name ? null : error.message),
      );
      toast.show(
        split.globalMessage ?? split.fieldErrors.name ?? error.message,
      );
    },
  });
  const pending = create.isPending || uploadImage.isPending;

  function submit() {
    if (pending) {
      return;
    }
    setNameError(null);
    setFormError(null);
    create.mutate(
      rosterDraftCreateInput({ name, sport, groupId: tagGroupId }, fitted),
    );
  }

  async function pickImage() {
    const result = await pickGroupImage(locale);
    if (!result) {
      return;
    }
    if (!result.image.ok) {
      setImageError(result.image.error);
      return;
    }
    setImageError(null);
    setPicked({ uri: result.uri, upload: result.image });
  }

  function leaveGroupMode() {
    setSport(sport);
    setMode("form");
  }

  const adderBody =
    source === "phone" ? (
      <CreateTeamPhoneLookup
        sport={sport}
        listedPhones={fitted.phones.map((phone) => phone.e164)}
        full={full}
        disabled={pending}
        onAdd={(phone) => {
          setDraft((current) => addDraftPhone(current, phone, sport));
          setAdderOpen(false);
        }}
      />
    ) : (
      <CreateTeamTembaSearch
        listedUserIds={fitted.invites.map((invite) => invite.userId)}
        full={full}
        disabled={pending}
        onInvite={(user) => {
          setDraft((current) =>
            addDraftInvites(
              current,
              [{ userId: user.id, name: user.name, source: { kind: "temba" } }],
              sport,
            ),
          );
          toast.show(m.team.addPlayers.listed(user.name));
        }}
      />
    );

  return (
    <Screen
      footer={
        <>
          <View style={{ flex: 1 }}>
            <Button
              label={teamCreateSubmitLabel({ name, sport, count }, locale)}
              size="lg"
              pending={pending}
              onPress={submit}
            />
          </View>
          <View style={{ width: CANCEL_WIDTH }}>
            <Button
              label={m.common.cancel}
              variant="outline"
              size="lg"
              disabled={pending}
              onPress={leave}
            />
          </View>
        </>
      }
    >
      <CreateTeamHeader
        title={mode === "group" ? c.fromGroupTitle : c.title}
        onBack={mode === "group" ? leaveGroupMode : undefined}
      />
      {formError ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}
      {mode === "group" ? (
        <CreateTeamFromGroup
          groups={groups}
          loading={organized.isPending}
          groupId={group?.id ?? null}
          onGroupChange={(next) => {
            setGroupId(next.id);
            setDraft((current) => rosterDraftForSport(current, next.sport));
          }}
          draft={fitted}
          sport={sport}
          captainName={captainName}
          onToggle={(member, groupName) =>
            setDraft((current) =>
              toggleDraftGroupMember(
                rosterDraftForSport(current, sport),
                member,
                { groupName, sport },
              ),
            )
          }
          tagged={tagged}
          onTaggedChange={setTagged}
          disabled={pending}
        />
      ) : (
        <CreateTeamView
          name={name}
          onNameChange={setName}
          nameError={nameError}
          imageUri={picked?.uri ?? null}
          imageError={imageError}
          onPickImage={() => void pickImage()}
          onClearImage={() => {
            setPicked(null);
            setImageError(null);
          }}
          sport={sport}
          onSportChange={(next) => {
            setSport(next);
            setDraft((current) => rosterDraftForSport(current, next));
          }}
          roster={roster}
          adder={adderOpen && !full ? { source, body: adderBody } : null}
          onSourceChange={setSource}
          onFromGroup={() => setMode("group")}
          onAddMore={() => {
            setSource("phone");
            setAdderOpen(true);
          }}
          onRemoveRow={(key) =>
            setDraft((current) => removeDraftRow(current, key))
          }
          pending={pending}
        />
      )}
    </Screen>
  );
}

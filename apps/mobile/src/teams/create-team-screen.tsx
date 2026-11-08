import { DEFAULT_SPORT, isSport, type Sport } from "@repo/domain/sport";
import {
  addDraftInvites,
  addDraftPhone,
  EMPTY_TEAM_ROSTER_DRAFT,
  removeDraftRow,
  rosterDraftCreateInput,
  rosterDraftForSport,
  rosterDraftSpotsLeft,
  rosterDraftView,
  type TeamRosterDraft,
} from "@repo/domain/team-roster-draft";
import { useRouter } from "expo-router";
import { useState } from "react";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError } from "../lib/form-error";
import { Screen } from "../primitives/screen";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { CreateTeamView } from "./create-team-view";
import { TeamAddPlayersSheet } from "./team-add-players-sheet";
import { teamPath } from "./teams-model";

export function CreateTeamScreen({ groupId }: { groupId: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const [name, setName] = useState("");
  const [pickedSport, setSport] = useState<Sport>(DEFAULT_SPORT);
  const [draft, setDraft] = useState<TeamRosterDraft>(EMPTY_TEAM_ROSTER_DRAFT);
  const [addOpen, setAddOpen] = useState(false);

  const tagGroup = api.groups.byId.useQuery(
    { id: groupId ?? "" },
    { enabled: groupId != null },
  );
  const tag =
    groupId && tagGroup.data?.canCreateTeam && isSport(tagGroup.data.sport)
      ? {
          id: tagGroup.data.id,
          name: tagGroup.data.name ?? m.group.untitled,
          sport: tagGroup.data.sport,
        }
      : null;
  const sport = tag?.sport ?? pickedSport;
  const organized = api.games.listCreateGroups.useQuery();
  const groups = (organized.data ?? [])
    .filter((group) => group.sport === sport)
    .sort((a, b) => Number(b.id === tag?.id) - Number(a.id === tag?.id));
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fitted = rosterDraftForSport(draft, sport);
  const roster = rosterDraftView(
    fitted,
    { sport, captainName: m.common.you, groupName: tag?.name ?? null },
    locale,
  );

  const create = api.teams.create.useMutation({
    onSuccess: async (team) => {
      toast.show(m.team.toast.created);
      await utils.teams.mine.invalidate();
      if (team.groupTag) {
        await utils.groups.byId.invalidate({ id: team.groupTag.id });
      }
      router.replace(teamPath(team.id));
    },
    onError: (error) => {
      const split = splitTrpcFormError(error);
      setNameError(split.fieldErrors.name ?? null);
      setFormError(
        split.globalMessage ?? (split.fieldErrors.name ? null : error.message),
      );
      toast.show(
        split.globalMessage ?? split.fieldErrors.name ?? error.message,
      );
    },
  });

  function submit() {
    if (create.isPending) {
      return;
    }
    setNameError(null);
    setFormError(null);
    create.mutate(
      rosterDraftCreateInput({ name, sport, groupId: tag?.id }, fitted),
    );
  }

  return (
    <Screen>
      <CreateTeamView
        name={name}
        sport={sport}
        onSportChange={(next) => {
          setSport(next);
          setDraft((current) => rosterDraftForSport(current, next));
        }}
        tagNote={tag ? m.team.groupTag.createNote(tag.name) : null}
        onNameChange={setName}
        nameError={nameError}
        formError={formError}
        roster={roster}
        onAddMore={() => setAddOpen(true)}
        onRemoveRow={(key) =>
          setDraft((current) => removeDraftRow(current, key))
        }
        pending={create.isPending || (groupId != null && tagGroup.isLoading)}
        onSubmit={submit}
        onCancel={() => router.back()}
      />
      <TeamAddPlayersSheet
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        sport={sport}
        spotsLeft={rosterDraftSpotsLeft(fitted, sport)}
        groups={groups}
        target={{
          kind: "draft",
          listedUserIds: fitted.invites.map((invite) => invite.userId),
          listedPhones: fitted.phones.map((phone) => phone.e164),
          onAddPhone: (phone) =>
            setDraft((current) => addDraftPhone(current, phone, sport)),
          onAddInvites: (invites) =>
            setDraft((current) => addDraftInvites(current, invites, sport)),
        }}
      />
    </Screen>
  );
}

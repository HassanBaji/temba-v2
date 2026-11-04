"use client";

import { Lock } from "lucide-react";
import * as React from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import { SettingsChoices } from "~/components/settings/settings-choices";
import {
  SETTINGS_PATH,
  SettingsScreen,
} from "~/components/settings/settings-screen";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { displayBand } from "~/components/you/you-format";
import { groupRowView } from "~/components/you/you-groups-model";
import { useSetSport } from "~/components/settings/use-set-sport";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  isPreferredPosition,
  preferredPositionChoices,
  type PreferredPosition,
} from "@repo/domain/preferred-position";
import {
  MATCH_HISTORY_VISIBILITIES,
  type MatchHistoryVisibility,
} from "@repo/domain/profile-details";

type Details = RouterOutputs["users"]["profileDetails"];

function LockedLevelCard() {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.you.padel;
  const profile = api.users.myProfile.useQuery({ sport: "padel" });
  const groups = api.ratings.myGroupLevels.useQuery({ sport: "padel" });

  if (!profile.data) {
    return <Skeleton className="rounded-card h-40 w-full" />;
  }
  const level = profile.data.level;
  const note = !level
    ? copy.lockNoteNone
    : level.provisional
      ? copy.lockNoteProvisional
      : copy.lockNote;

  return (
    <section className="border-rule rounded-card flex flex-col gap-3 border p-5">
      <div className="text-meta text-muted-foreground flex items-center justify-between">
        <h2 className="text-meta font-normal">{copy.level}</h2>
        <Lock aria-hidden="true" className="size-4" strokeWidth={2} />
      </div>
      {level ? (
        <p className="flex items-baseline gap-2.5">
          <span dir="ltr" className="font-expanded text-hero leading-none">
            {displayBand(level.levelBand)}
          </span>
          <span className="font-expanded text-title tabular-nums">
            {level.rating.toFixed(2)}
          </span>
          <span className="text-eyebrow text-muted-foreground ms-auto">
            {copy.general}
          </span>
        </p>
      ) : (
        <p className="font-expanded text-h2">{m.you.hero.noLevel}</p>
      )}
      <p className="text-meta text-muted-foreground leading-[1.5]">{note}</p>
      {groups.data && groups.data.length > 0 ? (
        <ul className="border-rule flex flex-col gap-1.5 border-t pt-3">
          {groups.data.map((row) => {
            const view = groupRowView(row, locale);
            return (
              <li
                key={view.groupId}
                className="text-meta grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] items-baseline gap-3"
              >
                <span className="text-ink truncate">{view.name}</span>
                <span className="text-muted-foreground truncate">
                  {view.sub}
                </span>
                <span dir="ltr" className="text-ink font-semibold tabular-nums">
                  {view.band} {view.level}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

function PreferredSide({ details }: { details: Details }) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.you.padel;
  const utils = api.useUtils();
  const [optimistic, setOptimistic] = React.useState<PreferredPosition>();
  const save = api.users.setPreferredPosition.useMutation({
    onMutate: ({ preferredPosition }) => setOptimistic(preferredPosition),
    onError: (error) => {
      setOptimistic(undefined);
      toastGlobalFormError(error);
    },
    onSuccess: async () => {
      await Promise.all([
        utils.users.profileDetails.invalidate(),
        utils.users.onboardingState.invalidate(),
      ]);
      setOptimistic(undefined);
    },
  });
  const stored = isPreferredPosition(details.preferredPosition)
    ? details.preferredPosition
    : null;
  const selected = optimistic ?? stored;

  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h2 id="padel-side-title" className="text-lead text-ink font-semibold">
          {copy.preferredSide}
        </h2>
        <p className="text-meta text-muted-foreground">
          {copy.preferredSideNote}
        </p>
      </div>
      <SettingsChoices
        variant="segmented"
        physical
        labelledBy="padel-side-title"
        describedBy="padel-side-note"
        choices={preferredPositionChoices(locale).map((choice) => ({
          value: choice.value,
          name: choice.label,
          detail: copy.sideSub[choice.value],
        }))}
        value={selected}
        onSelect={(preferredPosition) => save.mutate({ preferredPosition })}
        disabled={save.isPending}
      />
      {selected ? (
        <p id="padel-side-note" className="text-eyebrow text-muted-foreground">
          {copy.sideNote[selected]}
        </p>
      ) : null}
    </section>
  );
}

function MatchHistoryVisibilityControl({ details }: { details: Details }) {
  const m = useMessages();
  const copy = m.you.padel;
  const utils = api.useUtils();
  const save = api.users.setMatchHistoryVisibility.useMutation({
    onMutate: ({ visibility }) => {
      utils.users.profileDetails.setData(undefined, (old) =>
        old ? { ...old, matchHistoryVisibility: visibility } : old,
      );
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
    onSettled: async () => {
      await utils.users.profileDetails.invalidate();
    },
  });
  const selected: MatchHistoryVisibility = details.matchHistoryVisibility;

  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h2
          id="padel-history-title"
          className="text-lead text-ink font-semibold"
        >
          {copy.matchHistory}
        </h2>
        <p
          id="padel-history-note"
          className="text-meta text-muted-foreground leading-[1.5]"
        >
          {copy.visibilityNote[selected]}
        </p>
      </div>
      <SettingsChoices
        variant="pills"
        labelledBy="padel-history-title"
        describedBy="padel-history-note"
        choices={MATCH_HISTORY_VISIBILITIES.map((value) => ({
          value,
          name: copy.visibility[value],
        }))}
        value={selected}
        onSelect={(visibility) => save.mutate({ visibility })}
        disabled={save.isPending}
      />
    </section>
  );
}

function PadelForm({ details }: { details: Details }) {
  const m = useMessages();
  const copy = m.you.padel;
  const setSports = useSetSport("padel");
  const hasPadel = details.sports.includes("padel");

  return (
    <div className="flex flex-col gap-8">
      <LockedLevelCard />
      <PreferredSide details={details} />
      <MatchHistoryVisibilityControl details={details} />
      <div className="border-rule flex flex-col gap-2 border-t pt-6">
        {hasPadel ? (
          <>
            <Button
              type="button"
              variant="link"
              className="text-destructive h-auto min-h-11 self-start px-0 font-semibold no-underline"
              pending={setSports.isPending}
              pendingLabel={m.common.saving}
              onClick={() =>
                setSports.mutate({
                  sports: details.sports.filter((sport) => sport !== "padel"),
                })
              }
            >
              {copy.remove}
            </Button>
            <p className="text-eyebrow text-muted-foreground leading-[1.5]">
              {copy.removeNote}
            </p>
          </>
        ) : (
          <>
            <Button
              type="button"
              size="lg"
              className="w-full font-semibold"
              pending={setSports.isPending}
              pendingLabel={m.common.saving}
              onClick={() =>
                setSports.mutate({ sports: [...details.sports, "padel"] })
              }
            >
              {copy.add}
            </Button>
            <p className="text-eyebrow text-muted-foreground text-center">
              {copy.addNote}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Padel profile: the locked Level, Preferred side, history visibility, add or remove. */
export function PadelProfileScreen() {
  const m = useMessages();
  const details = api.users.profileDetails.useQuery();

  return (
    <SettingsScreen title={m.you.padel.title} backHref={SETTINGS_PATH}>
      {details.data ? (
        <PadelForm details={details.data} />
      ) : (
        <div aria-busy="true" className="flex flex-col gap-6">
          <Skeleton className="rounded-card h-40 w-full" />
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      )}
    </SettingsScreen>
  );
}

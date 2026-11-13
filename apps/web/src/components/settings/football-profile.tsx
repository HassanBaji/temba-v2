"use client";

import * as React from "react";
import { toast } from "sonner";

import { useLocale, useMessages } from "~/components/locale-provider";
import { CardChoice } from "~/components/onboarding/onboarding-choices";
import { SettingsChoices } from "~/components/settings/settings-choices";
import {
  SETTINGS_PATH,
  SettingsScreen,
} from "~/components/settings/settings-screen";
import { useSetSport } from "~/components/settings/use-set-sport";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { invalidateRatingReads } from "~/trpc/invalidate-rating-reads";
import { api, type RouterOutputs } from "~/trpc/react";
import {
  DEFAULT_FOOTBALL_POSITION,
  FOOTBALL_ROLES,
  footballPositionChoices,
  isFootballPosition,
  isFootballRole,
  type FootballPosition,
  type FootballRole,
} from "@repo/domain/football-lineup";
import {
  footballSelfPlacementChoices,
  selfDeclareChoiceFromFootballPlacement,
  type FootballSelfPlacement,
} from "@repo/domain/football-self-placement";

type Details = RouterOutputs["users"]["profileDetails"];

const ROLE_KEYS = { outfield: "outfield", keeper: "goalkeeper" } as const;

type FootballChoice = {
  role: FootballRole;
  position: FootballPosition | null;
};

function FootballForm({ details }: { details: Details }) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.you.footballProfile;
  const utils = api.useUtils();
  const me = api.ratings.me.useQuery({ sport: "football" });
  const setSports = useSetSport("football");
  const [placement, setPlacement] =
    React.useState<FootballSelfPlacement | null>(null);
  const declare = api.ratings.selfDeclare.useMutation({
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const [optimistic, setOptimistic] = React.useState<FootballChoice>();
  const savePreferences = api.users.setFootballPreferences.useMutation({
    onMutate: (next) => setOptimistic(next),
    onError: (error) => {
      setOptimistic(undefined);
      toastGlobalFormError(error);
    },
    onSuccess: async () => {
      await Promise.all([
        utils.users.profileDetails.invalidate(),
        utils.users.footballProfile.invalidate(),
        utils.users.onboardingState.invalidate(),
      ]);
      setOptimistic(undefined);
    },
  });

  const hasFootball = details.sports.includes("football");
  const role =
    optimistic?.role ??
    (isFootballRole(details.preferredFootballRole)
      ? details.preferredFootballRole
      : null);
  const storedPosition = isFootballPosition(details.preferredFootballPosition)
    ? details.preferredFootballPosition
    : null;
  const position = optimistic ? optimistic.position : storedPosition;
  const ovr = me.data?.ovr ?? null;
  const canPlace = me.data?.canSelfDeclare ?? false;
  const pending = declare.isPending || setSports.isPending;

  async function placeLevel() {
    if (!placement || !canPlace) {
      return true;
    }
    try {
      await declare.mutateAsync({
        sport: "football",
        choice: selfDeclareChoiceFromFootballPlacement(placement),
      });
    } catch {
      return false;
    }
    await invalidateRatingReads(utils);
    return true;
  }

  async function addFootball() {
    if (pending || !(await placeLevel())) {
      return;
    }
    setSports.mutate({ sports: [...details.sports, "football"] });
  }

  async function saveLevel() {
    if (pending || !placement) {
      return;
    }
    if (await placeLevel()) {
      setPlacement(null);
      toast.success(m.webYou.settings.levelPlaced);
    }
  }

  return (
    <div className="flex flex-col gap-7">
      <section className="flex flex-col gap-2.5">
        <h2
          id="football-role-title"
          className="text-meta text-muted-foreground font-normal"
        >
          {copy.joinAs}
        </h2>
        <SettingsChoices
          labelledBy="football-role-title"
          choices={FOOTBALL_ROLES.map((value) => ({
            value,
            name: copy.roles[ROLE_KEYS[value]],
            detail: copy.roleSub[ROLE_KEYS[value]],
          }))}
          value={role}
          onSelect={(next) =>
            savePreferences.mutate({
              role: next,
              position:
                next === "keeper"
                  ? null
                  : (storedPosition ?? DEFAULT_FOOTBALL_POSITION),
            })
          }
          disabled={savePreferences.isPending}
        />
      </section>

      {role === "keeper" ? null : (
        <section className="flex flex-col gap-2.5">
          <h2
            id="football-position-title"
            className="text-meta text-muted-foreground font-normal"
          >
            {copy.position}
          </h2>
          <SettingsChoices
            labelledBy="football-position-title"
            mono
            choices={footballPositionChoices(locale).map((choice) => ({
              value: choice.value,
              name: choice.code,
              detail: choice.label.toLowerCase(),
            }))}
            value={position}
            onSelect={(next) =>
              savePreferences.mutate({ role: "outfield", position: next })
            }
            disabled={savePreferences.isPending}
          />
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2
            id="football-level-title"
            className="text-meta text-muted-foreground font-normal"
          >
            {copy.level}
          </h2>
          {canPlace ? (
            <span className="text-eyebrow text-muted-foreground">
              {copy.selfPlaced}
            </span>
          ) : null}
        </div>
        {me.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : canPlace ? (
          <div
            role="radiogroup"
            aria-labelledby="football-level-title"
            className="flex flex-col gap-2"
          >
            {footballSelfPlacementChoices(locale).map((choice) => (
              <CardChoice
                key={choice.value}
                role="radio"
                selected={placement === choice.value}
                title={choice.label}
                description={choice.description}
                onSelect={() => {
                  if (!pending) {
                    setPlacement(choice.value);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="border-rule rounded-card flex flex-col gap-1 border px-5 py-4">
            {ovr != null ? (
              <p className="font-expanded text-h2 tabular-nums">
                {m.rating.ovr.value(String(ovr))}
              </p>
            ) : null}
            <p className="text-meta text-muted-foreground leading-[1.5]">
              {copy.levelLocked}
            </p>
          </div>
        )}
      </section>

      <div className="border-rule flex flex-col gap-2 border-t pt-6">
        {hasFootball ? (
          <>
            {canPlace ? (
              <Button
                type="button"
                size="lg"
                className="w-full font-semibold"
                disabled={!placement}
                pending={declare.isPending}
                pendingLabel={m.common.saving}
                onClick={() => {
                  void saveLevel();
                }}
              >
                {copy.save}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="link"
              className="text-destructive h-auto min-h-11 self-start px-0 font-semibold no-underline"
              pending={setSports.isPending}
              pendingLabel={m.common.saving}
              onClick={() =>
                setSports.mutate({
                  sports: details.sports.filter(
                    (sport) => sport !== "football",
                  ),
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
              pending={pending}
              pendingLabel={m.common.saving}
              onClick={() => {
                void addFootball();
              }}
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

/** Football profile: how you join, position, self-placed Level, add or remove. */
export function FootballProfileScreen() {
  const m = useMessages();
  const details = api.users.profileDetails.useQuery();

  return (
    <SettingsScreen
      title={m.you.footballProfile.title}
      backHref={SETTINGS_PATH}
    >
      {details.data ? (
        <FootballForm details={details.data} />
      ) : (
        <div aria-busy="true" className="flex flex-col gap-6">
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-[60px] w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
    </SettingsScreen>
  );
}

"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  SetLevelFields,
  SetLevelMemberSummary,
  type SetLevelMember,
} from "~/components/groups/set-level-form";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { invalidateRatingReads } from "~/trpc/invalidate-rating-reads";
import { api, type RouterOutputs } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";
import { levelFaceFor, ovrFromLevel } from "@repo/domain/football-ovr";
import { levelSliderLabel, ovrSliderLabel } from "@repo/domain/level-slider";
import { sportLabel, type Sport } from "@repo/domain/sport";

type ProfileRating = RouterOutputs["users"]["playerProfile"]["rating"];

function memberFrom(
  userId: string,
  name: string,
  sport: Sport,
  rating: ProfileRating,
): SetLevelMember {
  return {
    userId,
    name,
    levelBand: rating?.levelBand ?? null,
    levelProvisional: rating?.provisional ?? false,
    level: rating?.level ?? null,
    ovr:
      sport === "football" && rating
        ? Math.round(ovrFromLevel(rating.levelValue))
        : null,
    ratedMatchCount: rating?.ratedMatchCount ?? 0,
    levelOverride: null,
  };
}

/**
 * A Verifier's "Calibrate level" on a Player profile (ADR-0072): the set-level
 * form in a sheet, football in OVR.
 */
export function CalibrateLevelAction({
  userId,
  name,
  sport,
  rating,
}: {
  userId: string;
  name: string;
  sport: Sport;
  rating: ProfileRating;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.rating.verifier.calibrate;
  const utils = api.useUtils();
  const [open, setOpen] = React.useState(false);
  const member = memberFrom(userId, name, sport, rating);

  const calibrate = api.ratings.setLevelAsVerifier.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async (_result, variables) => {
      toast.success(
        copy.saved(
          name,
          variables.ovr === undefined
            ? levelSliderLabel(variables.levelTenths ?? 0)
            : ovrSliderLabel(variables.ovr),
        ),
      );
      setOpen(false);
      await invalidateRatingReads(utils);
    },
  });

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full font-semibold"
        onClick={() => {
          calibrate.reset();
          setOpen(true);
        }}
      >
        {copy.action}
      </Button>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next && !calibrate.isPending) {
            setOpen(false);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>
              {copy.title(sportLabel(sport, locale) ?? "")}
            </SheetTitle>
            <SheetDescription>{copy.description}</SheetDescription>
          </SheetHeader>
          {open ? (
            <div className="flex flex-col gap-5 px-4 pb-6">
              <SetLevelMemberSummary member={member} />
              <SetLevelFields
                key={`${userId}:${sport}`}
                member={member}
                face={levelFaceFor(sport)}
                pending={calibrate.isPending}
                error={calibrate.error}
                onSubmit={({ value, reason, note }) =>
                  calibrate.mutate({
                    userId,
                    sport,
                    ...(sport === "football"
                      ? { ovr: value }
                      : { levelTenths: value }),
                    reason,
                    note,
                  })
                }
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}

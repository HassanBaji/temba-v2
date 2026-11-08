"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldTitle,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Skeleton } from "~/components/ui/skeleton";
import {
  acceptCourts,
  acceptCtaLabel,
  acceptDraftForTeam,
  acceptPickCourt,
  acceptPickDay,
  acceptPickVenue,
  acceptSlotDays,
  acceptVenueChips,
  initialAcceptDraft,
  validateAcceptDraft,
  type AcceptDraft,
  type AcceptDraftField,
} from "@repo/domain/challenge-accept";
import { api } from "~/trpc/react";

import { ChallengeChips } from "./challenge-chips";

/**
 * 2b: pick the Team, a Venue (preferred first), a slot, and optionally a
 * Court and a price each, then send. A Team with a pending Proposal here
 * opens on its terms and the send changes it.
 */
export function ChallengeAcceptDialog({
  challengeId,
  open,
  teamId,
  onOpenChange,
}: {
  challengeId: string;
  open: boolean;
  teamId?: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const copy = m.challenge.accept;
  const options = api.challenges.listProposeOptions.useQuery(
    { challengeId },
    { enabled: open },
  );
  const [draft, setDraft] = React.useState<AcceptDraft | null>(null);
  const [errors, setErrors] = React.useState<
    Partial<Record<AcceptDraftField, string>>
  >({});
  const data = options.data;

  React.useEffect(() => {
    if (!open) {
      setDraft(null);
      setErrors({});
    } else if (data && !draft) {
      setDraft(initialAcceptDraft(data, teamId));
    }
  }, [open, data, draft, teamId]);

  async function settle(message: string) {
    toast.success(message);
    await Promise.all([
      utils.challenges.byId.invalidate({ id: challengeId }),
      utils.challenges.listProposeOptions.invalidate({ challengeId }),
      utils.challenges.listOpen.invalidate(),
      utils.challenges.listMine.invalidate(),
    ]);
    onOpenChange(false);
  }
  const propose = api.challenges.propose.useMutation({
    onSuccess: () => settle(copy.sent),
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const change = api.challenges.changeProposal.useMutation({
    onSuccess: () => settle(copy.changed),
    onError: (error) => {
      toast.error(error.message);
    },
  });
  const pending = propose.isPending || change.isPending;
  const changing = Boolean(
    data?.teams.find((team) => team.id === draft?.teamId)?.pendingProposal,
  );

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !draft || pending) {
      return;
    }
    const result = validateAcceptDraft(draft, data, locale);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    if (result.proposalId) {
      change.mutate({
        proposalId: result.proposalId,
        venueId: result.value.venueId,
        courtId: result.value.courtId,
        startsAt: result.value.startsAt,
        pricePerPlayerFils: result.value.pricePerPlayerFils,
      });
    } else {
      propose.mutate({ challengeId, ...result.value });
    }
  }

  const days = data ? acceptSlotDays(data, locale) : [];
  const day = days.find((candidate) => candidate.key === draft?.dayKey);
  const courts = data && draft ? acceptCourts(data, draft.venueId) : [];

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent>
        <form onSubmit={onSubmit} className="contents">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {changing ? copy.changeTitle : copy.title}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {copy.description}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-4 pb-4 md:px-0 md:pb-0">
            {options.error ? (
              <ErrorState
                headingLevel={3}
                title={copy.errorTitle}
                message={options.error.message}
                onRetry={() => {
                  void options.refetch();
                }}
              />
            ) : !data || !draft ? (
              <Skeleton className="h-60 w-full" />
            ) : data.teams.length === 0 ? (
              <p className="text-body">{copy.noTeams}</p>
            ) : (
              <>
                <Field>
                  <FieldTitle>{copy.team}</FieldTitle>
                  <ChallengeChips
                    label={copy.team}
                    chips={data.teams.map((team) => ({
                      value: team.id,
                      label: team.displayName,
                    }))}
                    isSelected={(id) => id === draft.teamId}
                    onSelect={(id) => setDraft(acceptDraftForTeam(data, id))}
                  />
                  <FieldError>{errors.team}</FieldError>
                </Field>
                <Field>
                  <FieldTitle>{copy.venue}</FieldTitle>
                  <ChallengeChips
                    label={copy.venue}
                    chips={acceptVenueChips(data, locale).map((venue) => ({
                      value: venue.value,
                      label: venue.preferred
                        ? venue.accessibilityLabel
                        : venue.label,
                    }))}
                    isSelected={(id) => id === draft.venueId}
                    onSelect={(id) => setDraft(acceptPickVenue(draft, id))}
                  />
                  <FieldError>{errors.venue}</FieldError>
                </Field>
                {courts.length > 0 ? (
                  <Field>
                    <FieldTitle>{copy.court}</FieldTitle>
                    <FieldDescription>{copy.courtHint}</FieldDescription>
                    <ChallengeChips
                      label={copy.court}
                      chips={courts}
                      isSelected={(id) => id === draft.courtId}
                      onSelect={(id) => setDraft(acceptPickCourt(draft, id))}
                    />
                  </Field>
                ) : null}
                {days.length === 0 ? (
                  <p className="text-meta text-muted-foreground">
                    {copy.noSlots}
                  </p>
                ) : (
                  <Field>
                    <FieldTitle>{copy.day}</FieldTitle>
                    <ChallengeChips
                      label={copy.day}
                      chips={days.map((option) => ({
                        value: option.key,
                        label: option.label,
                        accessibilityLabel: option.accessibilityLabel,
                      }))}
                      isSelected={(key) => key === draft.dayKey}
                      onSelect={(key) => setDraft(acceptPickDay(draft, key))}
                    />
                    {day ? (
                      <>
                        <FieldDescription>{copy.time}</FieldDescription>
                        <ChallengeChips
                          label={copy.time}
                          chips={day.slots.map((slot) => ({
                            value: slot.startsAt.getTime(),
                            label: slot.label,
                            accessibilityLabel: slot.accessibilityLabel,
                          }))}
                          isSelected={(time) =>
                            time === draft.startsAt?.getTime()
                          }
                          onSelect={(time) =>
                            setDraft({ ...draft, startsAt: new Date(time) })
                          }
                        />
                      </>
                    ) : null}
                    <FieldError>{errors.slot}</FieldError>
                  </Field>
                )}
                <Field>
                  <FieldTitle>{copy.price}</FieldTitle>
                  <FieldDescription>{copy.priceHint}</FieldDescription>
                  <Input
                    inputMode="decimal"
                    dir="ltr"
                    aria-label={copy.price}
                    placeholder={copy.pricePlaceholder}
                    value={draft.price}
                    onChange={(event) =>
                      setDraft({ ...draft, price: event.target.value })
                    }
                    aria-invalid={errors.price ? true : undefined}
                  />
                  <FieldError>{errors.price}</FieldError>
                </Field>
                <p className="text-meta text-muted-foreground">{copy.footer}</p>
              </>
            )}
          </div>

          <ResponsiveDialogFooter>
            <ResponsiveDialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={pending}
              >
                {m.common.cancel}
              </Button>
            </ResponsiveDialogClose>
            {data && draft && data.teams.length > 0 ? (
              <Button
                type="submit"
                className="min-h-11"
                disabled={pending}
                aria-busy={pending}
              >
                {acceptCtaLabel(data, locale)}
              </Button>
            ) : null}
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

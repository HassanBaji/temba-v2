"use client";

import { X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import {
  ACCEPT_SLOT_PREVIEW,
  acceptCourts,
  acceptDraftForTeam,
  acceptDraftHasExtras,
  acceptPickCourt,
  acceptPickSlot,
  acceptPickVenue,
  acceptProposeLabel,
  acceptSlotCells,
  acceptTeamCards,
  acceptTimeHint,
  acceptToldLine,
  acceptVenueIsElsewhere,
  acceptVenueRows,
  initialAcceptDraft,
  validateAcceptDraft,
  type AcceptDraft,
  type AcceptDraftField,
} from "@repo/domain/challenge-accept";
import { api } from "~/trpc/react";

import { ChallengeChips } from "./challenge-chips";
import { CrestTile } from "./challenge-detail-parts";

function BlockHeader({
  id,
  label,
  hint,
}: {
  id: string;
  label: string;
  hint?: string | null;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-2.5">
      <span id={id} className="text-meta text-muted-foreground">
        {label}
      </span>
      {hint ? (
        <span className="text-eyebrow text-muted-foreground text-end">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border",
        checked ? "border-control-edge bg-control" : "border-input",
      )}
    >
      <span
        className={cn(
          "size-[7px] rounded-full",
          checked ? "bg-on-control" : "bg-transparent",
        )}
      />
    </span>
  );
}

function VenueRow({
  label,
  hint,
  checked,
  nested = false,
  onSelect,
}: {
  label: string;
  hint: string | null;
  checked: boolean;
  nested?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "text-body focus-visible:ring-ring/50 flex min-h-[52px] w-full items-center gap-3 px-4 py-3 text-start outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset",
        checked ? "bg-wash" : "bg-paper hover:bg-wash",
        nested && "ps-12",
      )}
    >
      <RadioDot checked={checked} />
      <span className="min-w-0 flex-1">{label}</span>
      {hint ? (
        <span className="text-eyebrow text-muted-foreground shrink-0">
          {hint}
        </span>
      ) : null}
    </button>
  );
}

/**
 * 2b: pick the Team, a Venue (their preferred first, the rest behind
 * Somewhere else) and a time, then propose. A Court and a price each are
 * optional, behind one line. A Team with a pending Proposal here opens on
 * its terms and the send changes it.
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
  const screen = m.challenge.detailScreen.accept;
  const ids = React.useId();
  const options = api.challenges.listProposeOptions.useQuery(
    { challengeId },
    { enabled: open },
  );
  const [draft, setDraft] = React.useState<AcceptDraft | null>(null);
  const [errors, setErrors] = React.useState<
    Partial<Record<AcceptDraftField, string>>
  >({});
  const [elsewhere, setElsewhere] = React.useState(false);
  const [allTimes, setAllTimes] = React.useState(false);
  const [extras, setExtras] = React.useState(false);
  const data = options.data;

  React.useEffect(() => {
    if (!open) {
      setDraft(null);
      setErrors({});
      setElsewhere(false);
      setAllTimes(false);
      setExtras(false);
    } else if (data && !draft) {
      const initial = initialAcceptDraft(data, teamId);
      setDraft(initial);
      setElsewhere(acceptVenueIsElsewhere(data, initial.venueId));
      setExtras(acceptDraftHasExtras(initial));
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
      if (result.errors.price) {
        setExtras(true);
      }
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

  const venues = data ? acceptVenueRows(data, locale) : null;
  const cells = data ? acceptSlotCells(data, locale) : [];
  const pickedIndex = cells.findIndex(
    (cell) => cell.value === draft?.startsAt?.getTime(),
  );
  const showAllTimes = allTimes || pickedIndex >= ACCEPT_SLOT_PREVIEW;
  const visibleCells = showAllTimes
    ? cells
    : cells.slice(0, ACCEPT_SLOT_PREVIEW);
  const courts = data && draft ? acceptCourts(data, draft.venueId) : [];
  const told =
    data && draft ? acceptToldLine(data, draft.teamId, locale) : null;

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
      <ResponsiveDialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]"
      >
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <ResponsiveDialogHeader className="px-[22px] pb-0 pt-3 text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start md:pt-[22px]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <ResponsiveDialogTitle className="font-expanded text-[30px] leading-none">
                  {changing ? copy.changeTitle : copy.title}
                </ResponsiveDialogTitle>
                <ResponsiveDialogDescription className="text-meta text-muted-foreground mt-2 leading-normal">
                  {data
                    ? screen.subtitle(data.posterTeam.displayName)
                    : copy.description}
                </ResponsiveDialogDescription>
              </div>
              <ResponsiveDialogClose asChild>
                <button
                  type="button"
                  aria-label={m.common.close}
                  disabled={pending}
                  className="border-rule text-ink focus-visible:ring-ring/50 flex size-10 shrink-0 items-center justify-center rounded-md border outline-none focus-visible:ring-[3px]"
                >
                  <X aria-hidden="true" className="size-[18px]" />
                </button>
              </ResponsiveDialogClose>
            </div>
          </ResponsiveDialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-[22px] py-5">
            {options.error ? (
              <ErrorState
                headingLevel={3}
                title={copy.errorTitle}
                message={options.error.message}
                onRetry={() => {
                  void options.refetch();
                }}
              />
            ) : !data || !draft || !venues ? (
              <Skeleton className="h-72 w-full" />
            ) : data.teams.length === 0 ? (
              <p className="text-body">{copy.noTeams}</p>
            ) : (
              <>
                <div>
                  <BlockHeader id={`${ids}-team`} label={copy.team} />
                  <RovingRadioGroup
                    aria-labelledby={`${ids}-team`}
                    className="grid grid-cols-2 gap-2"
                  >
                    {acceptTeamCards(data, locale).map((team) => {
                      const checked = team.value === draft.teamId;
                      return (
                        <button
                          key={team.value}
                          type="button"
                          role="radio"
                          aria-checked={checked}
                          aria-label={team.accessibilityLabel}
                          onClick={() => {
                            const next = acceptDraftForTeam(data, team.value);
                            setDraft(next);
                            setElsewhere(
                              acceptVenueIsElsewhere(data, next.venueId),
                            );
                            setExtras(acceptDraftHasExtras(next));
                          }}
                          className={cn(
                            "focus-visible:ring-ring/50 flex min-h-16 items-center gap-2.5 rounded-lg border px-3.5 py-3 text-start outline-none transition-colors focus-visible:ring-[3px]",
                            checked
                              ? "border-control-edge bg-control text-on-control"
                              : "border-rule bg-paper hover:bg-wash",
                          )}
                        >
                          <CrestTile
                            size="sm"
                            initials={team.initials}
                            tone={checked ? "ink" : "paper"}
                          />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-body font-semibold leading-tight">
                              {team.title}
                            </span>
                            {team.line ? (
                              <span
                                className={cn(
                                  "text-eyebrow",
                                  checked
                                    ? "text-dim"
                                    : "text-muted-foreground",
                                )}
                              >
                                {team.line}
                              </span>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </RovingRadioGroup>
                  {told ? (
                    <p className="text-eyebrow text-muted-foreground mt-2">
                      {told}
                    </p>
                  ) : null}
                  <FieldError>{errors.team}</FieldError>
                </div>

                <div>
                  <BlockHeader
                    id={`${ids}-venue`}
                    label={copy.venue}
                    hint={venues.hint}
                  />
                  <RovingRadioGroup
                    aria-labelledby={`${ids}-venue`}
                    className="border-rule divide-rule rounded-card divide-y overflow-hidden border"
                  >
                    {venues.rows.map((venue) => (
                      <VenueRow
                        key={venue.value}
                        label={venue.label}
                        hint={venue.hint}
                        checked={!elsewhere && venue.value === draft.venueId}
                        onSelect={() => {
                          setElsewhere(false);
                          setDraft(acceptPickVenue(draft, venue.value));
                        }}
                      />
                    ))}
                    {venues.elsewhere ? (
                      <>
                        <VenueRow
                          label={venues.elsewhere.label}
                          hint={venues.elsewhere.hint}
                          checked={elsewhere}
                          onSelect={() => {
                            setElsewhere(true);
                            if (!acceptVenueIsElsewhere(data, draft.venueId)) {
                              setDraft({
                                ...draft,
                                venueId: null,
                                courtId: null,
                              });
                            }
                          }}
                        />
                        {elsewhere
                          ? venues.elsewhere.venues.map((venue) => (
                              <VenueRow
                                key={venue.value}
                                nested
                                label={venue.label}
                                hint={null}
                                checked={venue.value === draft.venueId}
                                onSelect={() =>
                                  setDraft(acceptPickVenue(draft, venue.value))
                                }
                              />
                            ))
                          : null}
                      </>
                    ) : null}
                  </RovingRadioGroup>
                  <FieldError>{errors.venue}</FieldError>
                </div>

                <div>
                  <BlockHeader
                    id={`${ids}-time`}
                    label={copy.time}
                    hint={acceptTimeHint(data, locale)}
                  />
                  {cells.length === 0 ? (
                    <p className="text-meta text-muted-foreground">
                      {copy.noSlots}
                    </p>
                  ) : (
                    <>
                      <RovingRadioGroup
                        aria-labelledby={`${ids}-time`}
                        className="grid grid-cols-3 gap-2"
                      >
                        {visibleCells.map((cell) => {
                          const checked =
                            cell.value === draft.startsAt?.getTime();
                          return (
                            <button
                              key={cell.value}
                              type="button"
                              role="radio"
                              aria-checked={checked}
                              aria-label={cell.accessibilityLabel}
                              onClick={() =>
                                setDraft(
                                  acceptPickSlot(draft, data, cell.startsAt),
                                )
                              }
                              className={cn(
                                "focus-visible:ring-ring/50 flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-lg border outline-none transition-colors focus-visible:ring-[3px]",
                                checked
                                  ? "border-control-edge bg-control text-on-control"
                                  : "border-rule bg-paper hover:bg-wash",
                              )}
                            >
                              <span className="text-body font-semibold leading-tight">
                                {cell.time}
                              </span>
                              <span
                                className={cn(
                                  "text-[11px] leading-tight",
                                  checked
                                    ? "text-dim"
                                    : "text-muted-foreground",
                                )}
                              >
                                {cell.day}
                              </span>
                            </button>
                          );
                        })}
                      </RovingRadioGroup>
                      {!showAllTimes && cells.length > ACCEPT_SLOT_PREVIEW ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => setAllTimes(true)}
                        >
                          {screen.moreTimes}
                        </Button>
                      ) : null}
                    </>
                  )}
                  <FieldError>{errors.slot}</FieldError>
                </div>

                {extras ? (
                  <div className="space-y-4">
                    {courts.length > 0 ? (
                      <div>
                        <BlockHeader
                          id={`${ids}-court`}
                          label={copy.court}
                          hint={copy.courtHint}
                        />
                        <ChallengeChips
                          label={copy.court}
                          chips={courts}
                          isSelected={(id) => id === draft.courtId}
                          onSelect={(id) =>
                            setDraft(acceptPickCourt(draft, id))
                          }
                        />
                      </div>
                    ) : null}
                    <div>
                      <BlockHeader
                        id={`${ids}-price`}
                        label={copy.price}
                        hint={copy.priceHint}
                      />
                      <Input
                        inputMode="decimal"
                        dir="ltr"
                        aria-labelledby={`${ids}-price`}
                        placeholder={copy.pricePlaceholder}
                        value={draft.price}
                        onChange={(event) =>
                          setDraft({ ...draft, price: event.target.value })
                        }
                        aria-invalid={errors.price ? true : undefined}
                      />
                      <FieldError>{errors.price}</FieldError>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ms-3"
                    onClick={() => setExtras(true)}
                  >
                    {screen.extras}
                  </Button>
                )}
              </>
            )}
          </div>

          {data && draft && data.teams.length > 0 ? (
            <div className="border-rule border-t px-[22px] py-4">
              <Button
                type="submit"
                className="h-[52px] w-full rounded-lg font-semibold"
                pending={pending}
              >
                {acceptProposeLabel(draft, data, locale)}
              </Button>
            </div>
          ) : null}
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

"use client";

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import {
  dayInputValueFromPickerDate,
  pickerDateFromInstant,
} from "~/components/games/calendar-day";
import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { BackButton } from "~/components/ui/nav-icon-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Skeleton } from "~/components/ui/skeleton";
import { formatDayMonth, formatWeekday } from "@repo/domain/format-game-start";
import {
  SEASON_NAME_MAX_LENGTH,
  SEASON_NEW_STANDING_NOTE,
  dayKeyToInstant,
  formatSeasonRange,
  isDayKey,
  newSeasonSummaryLine,
  seasonCreatedToast,
  seasonDatesError,
  suggestedSeasonEnd,
  suggestedSeasonName,
  suggestedSeasonStart,
} from "@repo/domain/group-season";
import { groupSeasonsHref } from "~/lib/dashboard-paths";
import { cardFrame } from "~/lib/page-layout";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";

type SeasonList = RouterOutputs["groups"]["listSeasons"];

function NewSeasonFrame({
  groupId,
  groupName,
  children,
}: {
  groupId: string;
  groupName: string | null;
  children: React.ReactNode;
}) {
  return (
    <DashboardShell title="New season" hidePageHeader hideMobileTopBar>
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 pb-6">
        <header className="mt-6 flex items-center gap-3 lg:mt-2">
          <BackButton
            href={groupSeasonsHref(groupId)}
            label="Back to Seasons"
          />
          <div className="min-w-0">
            <PageTitle className="text-ink">New season</PageTitle>
            {groupName ? (
              <p className="text-meta text-muted-foreground truncate">
                {groupName}
              </p>
            ) : null}
          </div>
        </header>
        {children}
      </div>
    </DashboardShell>
  );
}

function DayPickerField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = isDayKey(value)
    ? pickerDateFromInstant(dayKeyToInstant(value))
    : undefined;
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className="border-rule text-body hover:bg-wash focus-visible:ring-ring/50 flex min-h-11 w-full items-center justify-between gap-2 rounded-md border px-3.5 text-start outline-none focus-visible:ring-[3px]"
          >
            <span className="tabular-nums">
              {selected
                ? `${formatWeekday(dayKeyToInstant(value), "short")} ${formatDayMonth(dayKeyToInstant(value))}`
                : "Pick a day"}
            </span>
            <CalendarDays
              aria-hidden="true"
              className="text-muted-foreground size-4 shrink-0"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(next) => {
              if (!next) {
                return;
              }
              onChange(dayInputValueFromPickerDate(next));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function NewSeasonForm({
  groupId,
  list,
}: {
  groupId: string;
  list: SeasonList;
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const now = new Date();
  const [name, setName] = useState(() => suggestedSeasonName(list.seasons));
  const [startsOn, setStartsOn] = useState(() =>
    suggestedSeasonStart(list.seasons, now),
  );
  const [endsOn, setEndsOn] = useState(() =>
    suggestedSeasonEnd(suggestedSeasonStart(list.seasons, now)),
  );
  const [submitted, setSubmitted] = useState(false);
  const createSeason = api.groups.createSeason.useMutation({
    onSuccess: async (season) => {
      toast.success(seasonCreatedToast(season));
      await Promise.all([
        utils.groups.listSeasons.invalidate({ groupId }),
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.seasonStanding.invalidate(),
        utils.groups.mine.invalidate(),
        utils.users.home.invalidate(),
      ]);
      router.push(groupSeasonsHref(groupId));
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const dates = { startsOn, endsOn };
  const datesError = seasonDatesError(dates, list.seasons);
  const trimmed = name.trim();
  const nameError =
    submitted && trimmed.length === 0 ? "Give the season a name." : null;
  const canPreview = !datesError;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (createSeason.isPending || !trimmed || datesError) {
      return;
    }
    createSeason.mutate({ groupId, name: trimmed, startsOn, endsOn });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="season-name">Name</FieldLabel>
          <Input
            id="season-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={SEASON_NAME_MAX_LENGTH}
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "season-name-error" : undefined}
          />
          <FieldError id="season-name-error">{nameError}</FieldError>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <DayPickerField
            id="season-starts"
            label="Starts"
            value={startsOn}
            onChange={(day) => {
              setStartsOn(day);
              if (endsOn < day) {
                setEndsOn(suggestedSeasonEnd(day));
              }
            }}
          />
          <DayPickerField
            id="season-ends"
            label="Ends"
            value={endsOn}
            onChange={setEndsOn}
          />
        </div>
        <p
          className={cn(
            "text-meta -mt-3",
            datesError ? "text-destructive" : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {newSeasonSummaryLine(dates, list.seasons)}
        </p>
      </FieldGroup>

      {canPreview ? (
        <section className={cardFrame} aria-label="Preview">
          <div className="flex items-end justify-between gap-3 px-5 py-4">
            <span className="font-expanded text-h1 uppercase leading-none tracking-[-0.03em]">
              {trimmed || suggestedSeasonName(list.seasons)}
            </span>
            <span className="text-meta text-muted-foreground shrink-0 tabular-nums">
              {formatSeasonRange(dates)}
            </span>
          </div>
          <div className="hatch mx-5 h-[3px] rounded-full" aria-hidden="true" />
          <p className="border-rule text-meta text-muted-foreground mt-4 border-t px-5 py-3.5">
            {SEASON_NEW_STANDING_NOTE}
          </p>
        </section>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full font-semibold"
        pending={createSeason.isPending}
        disabled={Boolean(datesError)}
      >
        Create {trimmed || "season"}
      </Button>
    </form>
  );
}

export default function NewSeasonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const seasons = api.groups.listSeasons.useQuery({ groupId: id });

  if (seasons.isLoading) {
    return (
      <NewSeasonFrame groupId={id} groupName={null}>
        <div aria-busy="true" className="flex flex-col gap-5">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="rounded-card h-32 w-full" />
        </div>
      </NewSeasonFrame>
    );
  }

  if (!seasons.data) {
    return (
      <NewSeasonFrame groupId={id} groupName={null}>
        <ErrorState
          title="Seasons could not be loaded"
          message={seasons.error?.message}
          onRetry={() => {
            void seasons.refetch();
          }}
        />
      </NewSeasonFrame>
    );
  }

  if (!seasons.data.canManage) {
    return (
      <NewSeasonFrame groupId={id} groupName={seasons.data.groupName}>
        <ErrorState
          title="Only the Group owner can open a season"
          onRetry={() => {
            void seasons.refetch();
          }}
        />
      </NewSeasonFrame>
    );
  }

  return (
    <NewSeasonFrame groupId={id} groupName={seasons.data.groupName}>
      <NewSeasonForm groupId={id} list={seasons.data} />
    </NewSeasonFrame>
  );
}

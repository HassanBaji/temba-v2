"use client";

import { groupDisplayName } from "@repo/domain/group-join";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import {
  ratingSettingsChanged,
  ratingSettingsScreen,
  type GroupRatingSettings,
  type PerformanceRatingMode,
  type RatingSettingsScreen as RatingSettingsView,
} from "@repo/domain/group-rating-settings";
import { CircleOffIcon, UserCogIcon, UsersIcon } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { RadioRow, ToggleCard } from "~/components/groups/group-form-parts";
import { useLocale, useMessages } from "~/components/locale-provider";
import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { BackButton } from "~/components/ui/nav-icon-button";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Skeleton } from "~/components/ui/skeleton";
import { groupHomeHref } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

const MODE_ICONS = {
  off: CircleOffIcon,
  organizer: UserCogIcon,
  everyone: UsersIcon,
} as const;

function Frame({
  groupId,
  groupName,
  children,
}: {
  groupId: string;
  groupName: string | null;
  children: ReactNode;
}) {
  const m = useMessages();
  return (
    <DashboardShell
      title={m.rating.settings.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[26px] pb-6">
        <header className="mt-6 flex items-center gap-3 lg:mt-2">
          <BackButton
            href={groupHomeHref(groupId)}
            label={m.webDashboard.backToGroup}
          />
          <div className="min-w-0">
            <PageTitle className="text-ink">
              {m.rating.settings.title}
            </PageTitle>
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

function SectionTitle({
  id,
  title,
  aside,
}: {
  id?: string;
  title: string;
  aside?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 id={id} className="text-title font-semibold">
        {title}
      </h2>
      {aside ? (
        <span className="text-meta text-muted-foreground">{aside}</span>
      ) : null}
    </div>
  );
}

function ModeIcon({ mode }: { mode: PerformanceRatingMode }) {
  const Icon = MODE_ICONS[mode];
  return (
    <span
      aria-hidden="true"
      className="border-rule flex size-9 shrink-0 items-center justify-center rounded-[10px] border"
    >
      <Icon className="size-4" />
    </span>
  );
}

function WeightBlock({
  labelledBy,
  weight,
  onSelect,
}: {
  labelledBy: string;
  weight: NonNullable<RatingSettingsView["weight"]>;
  onSelect: (weightPercent: number) => void;
}) {
  return (
    <div className="border-rule bg-wash rounded-[16px] border px-[18px] py-4">
      <div
        role="img"
        aria-label={weight.spoken}
        className="flex flex-col gap-2"
      >
        <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          <span
            className="bg-ink"
            style={{ width: `${weight.resultFraction * 100}%` }}
          />
          <span className="bg-muted-foreground flex-1" />
        </div>
        <div className="text-eyebrow flex justify-between">
          <span>
            <span className="text-body font-bold">{weight.resultPercent}</span>{" "}
            {weight.resultShare}
          </span>
          <span>
            <span className="text-body font-bold">
              {weight.performancePercent}
            </span>{" "}
            {weight.performanceShare}
          </span>
        </div>
      </div>
      <RovingRadioGroup
        aria-labelledby={labelledBy}
        className="mt-3.5 grid grid-cols-3 gap-1.5"
      >
        {weight.options.map((option) => (
          <button
            key={option.weightPercent}
            type="button"
            role="radio"
            aria-checked={option.selected}
            onClick={() => onSelect(option.weightPercent)}
            className={cn(
              "text-body focus-visible:ring-ring/50 h-11 rounded-[10px] border font-semibold outline-none focus-visible:ring-[3px]",
              option.selected
                ? "border-ink bg-control text-on-control"
                : "border-rule bg-paper text-ink hover:bg-wash",
            )}
          >
            {option.label}
          </button>
        ))}
      </RovingRadioGroup>
      <p className="text-eyebrow text-muted-foreground mt-3">{weight.note}</p>
    </div>
  );
}

function ManualChanges({
  section,
}: {
  section: RatingSettingsView["manualChanges"];
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <SectionTitle title={section.title} />
      <dl className="border-rule divide-rule flex flex-col divide-y overflow-hidden rounded-[14px] border">
        {section.rows.map((row) => (
          <div
            key={row.label}
            className="text-meta flex justify-between gap-3.5 px-[18px] py-3.5"
          >
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-end">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RatingSettingsForm({
  groupId,
  initial,
}: {
  groupId: string;
  initial: GroupRatingSettings;
}) {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const ids = {
    modes: useId(),
    weight: useId(),
    double: useId(),
  };
  const [draft, setDraft] = useState<GroupRatingSettings>(initial);
  const screen = ratingSettingsScreen(draft, locale);
  const dirty = ratingSettingsChanged(initial, draft);

  const save = api.groups.updateRatingSettings.useMutation({
    onSuccess: async () => {
      toast.success(m.rating.settings.savedToast);
      await Promise.all([
        utils.groups.byId.invalidate({ id: groupId }),
        utils.groups.ratingSettings.invalidate({ groupId }),
      ]);
      router.push(groupHomeHref(groupId));
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!dirty || save.isPending) {
          return;
        }
        save.mutate({ groupId, ...draft });
      }}
      className="flex flex-col gap-[26px]"
    >
      <section className="flex flex-col gap-2.5">
        <SectionTitle
          id={ids.modes}
          title={screen.afterEachGame}
          aside={screen.performanceRatings}
        />
        <RovingRadioGroup
          aria-labelledby={ids.modes}
          className="border-rule divide-rule flex flex-col divide-y overflow-hidden rounded-[16px] border"
        >
          {screen.modes.map((mode) => (
            <RadioRow
              key={mode.mode}
              title={mode.title}
              description={mode.description}
              selected={mode.selected}
              leading={<ModeIcon mode={mode.mode} />}
              onSelect={() => setDraft({ ...draft, mode: mode.mode })}
            />
          ))}
        </RovingRadioGroup>
      </section>

      {screen.weight ? (
        <section className="flex flex-col gap-2.5">
          <SectionTitle
            id={ids.weight}
            title={screen.weight.title}
            aside={screen.weight.name}
          />
          <WeightBlock
            labelledBy={ids.weight}
            weight={screen.weight}
            onSelect={(weightPercent) => setDraft({ ...draft, weightPercent })}
          />
        </section>
      ) : null}

      {screen.fairness ? (
        <section className="flex flex-col gap-2.5">
          <SectionTitle title={screen.fairness.title} />
          <ToggleCard
            id={ids.double}
            title={screen.fairness.countsDouble}
            help={screen.fairness.countsDoubleHint}
            checked={screen.fairness.countsDoubleOn}
            onCheckedChange={(organizerCountsDouble) =>
              setDraft({ ...draft, organizerCountsDouble })
            }
          />
          <p className="text-eyebrow text-muted-foreground">
            {screen.fairness.alwaysOn}
          </p>
        </section>
      ) : null}

      <ManualChanges section={screen.manualChanges} />

      <p className="text-eyebrow text-muted-foreground" aria-live="polite">
        {screen.footnote}
      </p>

      <div className="border-rule border-t pt-3.5">
        <Button
          type="submit"
          size="lg"
          pending={save.isPending}
          pendingLabel={m.common.saving}
          disabled={!dirty}
          className="w-full font-semibold"
        >
          {m.rating.settings.save}
        </Button>
      </div>
    </form>
  );
}

/**
 * Rating settings of a tier Group: who rates after a game, how
 * much it counts and whether the organizer counts double. Only Organizers
 * change them; a member who opens the page reads how ratings work here.
 */
export function RatingSettingsPage({ groupId }: { groupId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const query = api.groups.ratingSettings.useQuery({ groupId });
  const groupName = query.data
    ? groupDisplayName(query.data.group.name, locale)
    : null;

  if (isNotFoundError(query.error)) {
    notFound();
  }

  if (!query.data) {
    return (
      <Frame groupId={groupId} groupName={null}>
        {query.error ? (
          <ErrorState
            title={m.rating.settings.loadFailed}
            error={query.error}
            onRetry={() => {
              void query.refetch();
            }}
          />
        ) : (
          <>
            <Skeleton className="h-56 rounded-[16px]" />
            <Skeleton className="h-40 rounded-[16px]" />
          </>
        )}
      </Frame>
    );
  }

  return (
    <Frame groupId={groupId} groupName={groupName}>
      {query.data.settings ? (
        <RatingSettingsForm groupId={groupId} initial={query.data.settings} />
      ) : (
        <section className="border-rule rounded-[16px] border px-[22px] py-5">
          <p className="text-lead font-semibold">{query.data.line}</p>
          <p className="text-meta text-muted-foreground mt-1">
            {m.rating.settings.readOnly}
          </p>
        </section>
      )}
    </Frame>
  );
}

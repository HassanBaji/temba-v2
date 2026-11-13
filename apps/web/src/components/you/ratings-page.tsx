"use client";

import { ChevronRight, History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { TierCell } from "~/components/groups/tier-fish";
import {
  useLocale,
  useMessages,
  useTextDirection,
} from "~/components/locale-provider";
import { PageTitle } from "~/components/layout/page-title";
import { Hatch } from "~/components/ui/hatch";
import { BackButton } from "~/components/ui/nav-icon-button";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Skeleton } from "~/components/ui/skeleton";
import {
  groupHomeHref,
  youRatingHistoryHref,
  youRatingsHref,
} from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import {
  ratingsScreenView,
  type RatingsLevelView,
  type RatingsScreenView,
} from "@repo/domain/ratings-screen";
import { SPORTS, type Sport } from "@repo/domain/sport";

import { InYourGroupsList } from "./in-your-groups-card";
import { HeroCard, HeroRing } from "./level-hero";
import { YouCard, YouSection } from "./you-section";

const SPARK_WIDTH = 64;
const SPARK_HEIGHT = 22;
const SPARK_PAD = 4;

/** The way from the You page hero to the Ratings page. */
export function RatingsLink({ sport }: { sport: Sport }) {
  const m = useMessages();
  const copy = m.rating.screen.open;
  return (
    <Link
      href={youRatingsHref(sport)}
      className="border-rule bg-paper rounded-card hover:bg-wash focus-visible:ring-ring/50 flex min-h-11 items-center gap-3 border px-5 py-3 outline-none transition-colors focus-visible:ring-[3px]"
    >
      <span className="min-w-0 flex-1">
        <span className="text-body text-ink block font-semibold">
          {copy.title}
        </span>
        <span className="text-eyebrow text-muted-foreground block">
          {sport === "football" ? copy.football : copy.padel}
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="text-muted-foreground size-4 shrink-0 rtl:-scale-x-100"
      />
    </Link>
  );
}

function sparkPoints(values: readonly number[], rtl: boolean) {
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  return values.map((value, index) => {
    const along =
      SPARK_PAD +
      (index / Math.max(1, values.length - 1)) * (SPARK_WIDTH - SPARK_PAD * 2);
    const normalized = span === 0 ? 0.5 : (value - min) / span;
    return {
      x: rtl ? SPARK_WIDTH - along : along,
      y: SPARK_PAD + (1 - normalized) * (SPARK_HEIGHT - SPARK_PAD * 2),
    };
  });
}

function Sparkline({ values }: { values: readonly number[] }) {
  const { rtl } = useTextDirection();
  if (values.length < 2) {
    return null;
  }
  const points = sparkPoints(values, rtl);
  const last = points[points.length - 1]!;
  return (
    <svg
      aria-hidden="true"
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      className="block shrink-0"
    >
      <polyline
        points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        fill="none"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-on-focus"
      />
      <circle cx={last.x} cy={last.y} r="2.8" className="fill-on-focus" />
    </svg>
  );
}

/** The one ink card on the page: ring, band, number, change, next band. */
function LevelSection({ view }: { view: RatingsLevelView }) {
  if (view.kind === "none") {
    return (
      <YouSection title={view.title}>
        <HeroCard>
          <div className="flex flex-col gap-1.5">
            <p className="font-expanded text-h2">{view.message}</p>
            <p className="text-dim text-meta">{view.note}</p>
          </div>
        </HeroCard>
      </YouSection>
    );
  }

  return (
    <YouSection title={view.title} meta={view.status} note={view.note}>
      <section className="surface-focus rounded-card overflow-hidden">
        <p className="sr-only">{view.spoken}</p>
        <div aria-hidden="true" className="flex items-center gap-5 p-5">
          <HeroRing percent={view.ringPercent} hatched={view.ringHatched}>
            <span dir="ltr" className="font-expanded text-[38px] leading-none">
              {view.band}
            </span>
          </HeroRing>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-dim text-eyebrow">{view.numberLabel}</span>
            <span className="font-expanded mt-0.5 text-[46px] tabular-nums leading-none">
              {view.number}
            </span>
            {view.change ? (
              <span className="mt-2.5 flex items-center gap-2">
                <Sparkline values={view.change.points} />
                <bdi dir="ltr" className="font-expanded text-body tabular-nums">
                  {view.change.delta}
                </bdi>
                <span className="text-dim text-eyebrow">
                  {view.change.caption}
                </span>
              </span>
            ) : null}
          </div>
        </div>
        <div
          aria-hidden="true"
          className="border-dimrule text-meta flex items-baseline justify-between gap-3 border-t px-5 py-3"
        >
          <span className="text-dim">{view.footer.label}</span>
          {view.footer.value ? (
            <span>
              <bdi dir="ltr" className="font-expanded text-body">
                {view.footer.value}
              </bdi>
              <span className="text-dim">{view.footer.detail}</span>
            </span>
          ) : null}
        </div>
      </section>
    </YouSection>
  );
}

export function TierSection({
  tier,
}: {
  tier: NonNullable<RatingsScreenView["tier"]>;
}) {
  return (
    <YouSection title={tier.title} meta={tier.meta} note={tier.note}>
      <YouCard>
        <ul className="divide-rule divide-y">
          {tier.rows.map((row) => (
            <li key={row.groupId}>
              <Link
                href={groupHomeHref(row.groupId)}
                aria-label={row.spoken}
                className="hover:bg-wash focus-visible:ring-ring/50 flex items-center gap-3 px-4 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
              >
                <span className="flex w-11 shrink-0 justify-center">
                  <TierCell cell={row.cell} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-body text-ink block truncate font-semibold">
                    {row.name}
                  </span>
                  <span className="text-eyebrow text-muted-foreground block truncate">
                    {row.caption}
                  </span>
                </span>
                {row.points ? (
                  <bdi
                    dir="ltr"
                    className="font-expanded text-body text-ink shrink-0 tabular-nums"
                  >
                    {row.points}
                  </bdi>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </YouCard>
    </YouSection>
  );
}

/** Reserved (ADR-0065): hatched, "not yet", and never a number. */
function OfficialRankSection({
  official,
}: {
  official: RatingsScreenView["official"];
}) {
  return (
    <YouSection title={official.title} note={official.note}>
      <div className="rounded-card relative flex min-h-[72px] items-center overflow-hidden px-4 py-4">
        <Hatch radius="card" className="absolute inset-0" />
        <p className="text-meta text-ink relative font-semibold">
          {official.message}
        </p>
      </div>
    </YouSection>
  );
}

function RatingsBody({ view }: { view: RatingsScreenView }) {
  return (
    <div className="flex flex-col gap-[26px]">
      {view.order.map((section) => {
        if (section === "level") {
          return <LevelSection key={section} view={view.level} />;
        }
        if (section === "tier") {
          return view.tier ? (
            <TierSection key={section} tier={view.tier} />
          ) : null;
        }
        if (section === "groups") {
          return view.inYourGroups ? (
            <YouSection
              key={section}
              title={view.inYourGroups.title}
              meta={view.inYourGroups.meta}
              note={view.inYourGroups.note}
            >
              <InYourGroupsList rows={view.inYourGroups.rows} />
            </YouSection>
          ) : null;
        }
        return <OfficialRankSection key={section} official={view.official} />;
      })}
    </div>
  );
}

function SportSwitch({
  value,
  onSelect,
}: {
  value: Sport;
  onSelect: (sport: Sport) => void;
}) {
  const m = useMessages();
  return (
    <RovingRadioGroup
      aria-label={m.rating.screen.sport}
      className="border-rule bg-wash rounded-card flex gap-1 border p-1"
    >
      {SPORTS.map((sport) => {
        const selected = sport === value;
        return (
          <button
            key={sport}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(sport)}
            className={cn(
              "text-body focus-visible:ring-ring/50 min-h-10 flex-1 rounded-[10px] outline-none focus-visible:ring-[3px]",
              selected
                ? "bg-control text-on-control font-semibold"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            {m.common[sport]}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}

/**
 * Ratings: the Temba Level, a Group tier per tier Group
 * on football, "In your groups", and the reserved Official Rank slot.
 */
export function RatingsPage({ initialSport }: { initialSport: Sport }) {
  const m = useMessages();
  const locale = useLocale();
  const [sport, setSport] = useState<Sport>(initialSport);
  const level = api.ratings.me.useQuery({ sport });
  const tiers = api.ratings.myGroupTiers.useQuery(undefined, {
    enabled: sport === "football",
  });
  const standings = api.groups.myStandings.useQuery({ sport });
  const queries =
    sport === "football" ? [level, tiers, standings] : [level, standings];
  const failed = queries.find((query) => query.error);
  const ready =
    level.data && standings.data && (sport === "padel" || tiers.data);

  return (
    <DashboardShell
      title={m.rating.screen.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[26px] pb-10">
        <header className="mt-6 flex items-center gap-3 lg:mt-2">
          <BackButton
            href="/dashboard/you"
            label={m.webDashboard.settings.backToProfile}
          />
          <PageTitle className="text-ink min-w-0 flex-1">
            {m.rating.screen.title}
          </PageTitle>
          <Link
            href={youRatingHistoryHref(sport)}
            aria-label={m.rating.ratingHistory.open}
            title={m.rating.ratingHistory.open}
            className="border-rule text-ink hover:bg-wash focus-visible:ring-ring/50 flex size-11 shrink-0 items-center justify-center rounded-md border outline-none transition-colors focus-visible:ring-[3px]"
          >
            <History aria-hidden="true" className="size-5" />
          </Link>
        </header>
        <SportSwitch value={sport} onSelect={setSport} />
        {failed?.error ? (
          <ErrorState
            variant="inline"
            className="rounded-card px-5"
            title={m.rating.screen.loadFailed}
            error={failed.error}
            onRetry={() => {
              for (const query of queries) {
                void query.refetch();
              }
            }}
          />
        ) : ready ? (
          <RatingsBody
            view={ratingsScreenView(
              {
                sport,
                level: level.data,
                tiers: tiers.data ?? [],
                standings: standings.data,
              },
              locale,
            )}
          />
        ) : (
          <div aria-busy="true" className="flex flex-col gap-[26px]">
            <Skeleton className="rounded-card h-[220px] w-full" />
            <Skeleton className="rounded-card h-40 w-full" />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

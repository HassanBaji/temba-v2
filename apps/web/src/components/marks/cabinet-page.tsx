"use client";

import { EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { Switch } from "~/components/ui/switch";
import { YouSection } from "~/components/you/you-section";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import type { CoinKind } from "@repo/domain/marks";
import type { Sport } from "@repo/domain/sport";
import { playerMarkPath, playerMarksPath } from "~/lib/dashboard-paths";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  cabinetPageModel,
  cabinetTab,
  type CabinetKindRow,
  type CabinetMvpModel,
  type CabinetPageModel,
  type CoinCount,
} from "./cabinet-model";
import { MarkCoin } from "./mark-coin";

const focusRing =
  "outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]";

/** `×3` in the type's figures, left to right; a screen reader hears "3 received". */
export function CountFigure({
  count,
  className,
}: {
  count: CoinCount;
  className?: string;
}) {
  return (
    <>
      <span
        aria-hidden="true"
        dir="ltr"
        className={cn("font-expanded font-bold tabular-nums", className)}
      >
        {count.shown}
      </span>
      <span className="sr-only">{count.spoken}</span>
    </>
  );
}

/** Match history visibility keeps this cabinet from the viewer (E19). */
export function CabinetUnavailable() {
  const m = useMessages();
  return (
    <section className="border-rule rounded-card border p-5">
      <h1 className="text-lead font-semibold">
        {m.webMarks.cabinet.unavailableTitle}
      </h1>
      <p className="text-meta text-muted-foreground mt-1.5">
        {m.webMarks.cabinet.unavailableDescription}
      </p>
    </section>
  );
}

export function CabinetSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <Skeleton className="rounded-card h-[100px] w-full" />
      <Skeleton className="rounded-card h-[260px] w-full" />
    </div>
  );
}

function SportTabs({
  tabs,
  value,
  onSelect,
}: {
  tabs: CabinetPageModel["tabs"];
  value: Sport;
  onSelect: (sport: Sport) => void;
}) {
  const m = useMessages();
  return (
    <RovingRadioGroup
      aria-label={m.webUi.sport}
      className="border-rule flex shrink-0 gap-0.5 rounded-md border p-0.5"
    >
      {tabs.map((tab) => {
        const selected = tab.sport === value;
        return (
          <button
            key={tab.sport}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(tab.sport)}
            className={cn(
              "text-meta relative h-9 rounded-sm px-3 transition-colors after:absolute after:inset-x-0 after:top-1/2 after:min-h-11 after:-translate-y-1/2",
              focusRing,
              selected
                ? "bg-ink text-paper font-semibold"
                : "text-muted-foreground hover:text-ink bg-paper",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}

function MvpHero({ mvp, href }: { mvp: CabinetMvpModel; href: string }) {
  const tone = mvp.earned ? "ink" : "paper";
  const body = (
    <>
      <MarkCoin
        kind="mvp"
        size="sheet"
        tone={tone}
        state={mvp.earned ? "earned" : "notYet"}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline gap-2.5">
          {mvp.count ? (
            <CountFigure count={mvp.count} className="text-display" />
          ) : null}
          <span className="font-semibold">{mvp.name}</span>
        </p>
        <p
          className={cn(
            "text-eyebrow mt-1.5",
            mvp.earned ? "text-dim" : "text-muted-foreground",
          )}
        >
          {mvp.line}
        </p>
      </div>
    </>
  );
  const className = "rounded-card flex items-center gap-4 p-5";
  if (!mvp.earned) {
    return (
      <Surface tone={tone} className={cn(className, "border-rule border")}>
        {body}
      </Surface>
    );
  }
  return (
    <Surface
      as={Link}
      href={href}
      tone={tone}
      className={cn(
        className,
        // The ink Surface turns the ring paper, so the ring outside it is set to ink.
        "focus-visible:ring-ink/50 outline-none hover:opacity-90 focus-visible:ring-[3px] focus-visible:ring-offset-2",
      )}
    >
      {body}
    </Surface>
  );
}

function KindRow({ row, href }: { row: CabinetKindRow; href: string }) {
  const body = (
    <>
      <MarkCoin
        kind={row.kind}
        size="cabinet"
        state={row.earned ? "earned" : "notYet"}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-meta truncate font-semibold",
            !row.earned && "text-muted-foreground",
          )}
        >
          {row.name}
        </p>
        <p className="text-eyebrow text-muted-foreground">{row.sub}</p>
      </div>
      {row.count ? (
        <CountFigure count={row.count} className="text-title" />
      ) : null}
    </>
  );
  const className = "flex min-h-16 items-center gap-3.5 px-4 py-3";
  if (!row.earned) {
    return <div className={className}>{body}</div>;
  }
  return (
    <Link
      href={href}
      className={cn(
        className,
        "hover:bg-wash focus-visible:ring-inset",
        focusRing,
      )}
    >
      {body}
    </Link>
  );
}

function RoastsToggle({
  roasts,
}: {
  roasts: NonNullable<CabinetPageModel["roasts"]>;
}) {
  const utils = api.useUtils();
  const [chosen, setChosen] = useState<boolean | null>(null);
  const save = api.users.setHideRoasts.useMutation({
    onError: (error) => {
      setChosen(null);
      toastGlobalFormError(error);
    },
    onSettled: async () => {
      await Promise.all([
        utils.marks.cabinet.invalidate(),
        utils.marks.kindDetail.invalidate(),
      ]);
      setChosen(null);
    },
  });
  const titleId = "cabinet-hide-roasts";
  const helpId = "cabinet-hide-roasts-help";
  return (
    <div className="border-rule bg-paper rounded-card flex items-center gap-3.5 border px-[18px] py-3.5">
      <EyeOff
        aria-hidden="true"
        className="text-ink size-5 shrink-0"
        strokeWidth={2}
      />
      <div className="min-w-0 flex-1">
        <p id={titleId} className="text-ink text-meta font-semibold">
          {roasts.title}
        </p>
        <p id={helpId} className="text-eyebrow text-muted-foreground mt-0.5">
          {roasts.help}
        </p>
      </div>
      <Switch
        aria-labelledby={titleId}
        aria-describedby={helpId}
        checked={chosen ?? roasts.hidden}
        disabled={save.isPending}
        onCheckedChange={(hide) => {
          setChosen(hide);
          save.mutate({ hide });
        }}
      />
    </div>
  );
}

function CabinetBody({
  model,
  kindHref,
  tabs,
}: {
  model: CabinetPageModel;
  kindHref: (kind: CoinKind) => string;
  tabs: ReactNode;
}) {
  const m = useMessages();
  return (
    <div className="flex flex-col gap-[26px]">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-expanded text-h1">{m.marks.cabinet.title}</h1>
        {tabs}
      </div>
      <div className="flex flex-col gap-2.5">
        <MvpHero mvp={model.mvp} href={kindHref("mvp")} />
        <div className="text-meta text-muted-foreground flex flex-wrap justify-between gap-x-3">
          <p>{model.summary.received}</p>
          <p>{model.summary.notYet}</p>
        </div>
      </div>
      {model.sections.map((section) => (
        <YouSection
          key={section.group}
          title={section.title}
          meta={section.meta}
        >
          <ul className="border-rule bg-paper rounded-card divide-rule divide-y overflow-hidden border">
            {section.rows.map((row) => (
              <li key={row.kind}>
                <KindRow row={row} href={kindHref(row.kind)} />
              </li>
            ))}
          </ul>
        </YouSection>
      ))}
      {model.roasts ? <RoastsToggle roasts={model.roasts} /> : null}
    </div>
  );
}

function useGamesPlayed(userId: string, sport: Sport | null) {
  const padel = api.users.playerProfile.useQuery(
    { userId },
    { enabled: sport === "padel" },
  );
  const football = api.users.footballProfile.useQuery(
    { userId },
    { enabled: sport === "football" },
  );
  const data = sport === "padel" ? padel.data : football.data;
  return data?.overall.played ?? null;
}

/** All marks (3a): one sport's tab of a Player's cabinet. */
export function CabinetPage({
  userId,
  requestedSport,
}: {
  userId: string;
  requestedSport?: unknown;
}) {
  const router = useRouter();
  const locale = useLocale();
  const m = useMessages();
  const [chosen, setChosen] = useState<Sport | null>(null);
  const query = api.marks.cabinet.useQuery({ userId });
  const cabinet = query.data && !query.data.hidden ? query.data : null;
  const sport = cabinet
    ? (chosen ?? cabinetTab(cabinet, requestedSport))
    : null;
  const gamesPlayed = useGamesPlayed(userId, sport);

  if (query.data?.hidden || isNotFoundError(query.error)) {
    return <CabinetUnavailable />;
  }

  if (query.error) {
    return (
      <ErrorState
        title={m.webMarks.cabinet.loadError}
        message={query.error.message}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  if (!cabinet || !sport) {
    return <CabinetSkeleton />;
  }

  const model = cabinetPageModel(cabinet, sport, gamesPlayed, locale);

  return (
    <CabinetBody
      model={model}
      kindHref={(kind) => playerMarkPath(userId, kind, sport)}
      tabs={
        model.tabs.length > 1 ? (
          <SportTabs
            tabs={model.tabs}
            value={sport}
            onSelect={(tab) => {
              setChosen(tab);
              router.replace(playerMarksPath(userId, tab), { scroll: false });
            }}
          />
        ) : null
      }
    />
  );
}

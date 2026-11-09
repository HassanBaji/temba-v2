"use client";

import * as React from "react";

import { EntityMonogram } from "~/components/common/entity-monogram";
import { PageTitle } from "~/components/layout/page-title";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { BackButton } from "~/components/ui/nav-icon-button";
import { cn } from "~/lib/utils";

/** Back arrow and the step's title, on one line. */
export function ChallengePostHeader({
  title,
  backHref,
  onBack,
}: {
  title: string;
  backHref?: string;
  onBack?: () => void;
}) {
  return (
    <header className="mt-6 flex items-center gap-1 lg:mt-2">
      {onBack ? (
        <BackButton onClick={onBack} />
      ) : (
        <BackButton href={backHref ?? "/dashboard/challenges"} />
      )}
      <PageTitle className="text-ink">{title}</PageTitle>
    </header>
  );
}

/** A form section: expanded heading, a muted note at its end, then the controls. */
export function ChallengePostSection({
  title,
  hint,
  error,
  children,
}: {
  title: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const headingId = React.useId();
  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id={headingId}
          className="font-expanded text-title text-ink leading-tight"
        >
          {title}
        </h2>
        {hint ? (
          <p className="text-eyebrow text-muted-foreground min-w-0 truncate">
            {hint}
          </p>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
      {error ? (
        <p role="alert" className="text-destructive text-meta mt-2">
          {error}
        </p>
      ) : null}
    </section>
  );
}

/** The 44px boxes every choice here uses: 13px semibold, ink when picked. */
export function ChallengePostChip({
  selected,
  label,
  multiple = false,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "children"> & {
  selected: boolean;
  label: string;
  multiple?: boolean;
}) {
  return (
    <ChoiceChip
      role={multiple ? undefined : "radio"}
      aria-pressed={multiple ? selected : undefined}
      selected={selected}
      className={cn(
        "text-meta h-11 w-full min-w-0 px-2 font-semibold",
        className,
      )}
      {...props}
    >
      <span className="truncate">{label}</span>
    </ChoiceChip>
  );
}

const COLUMNS = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  6: "grid-cols-6",
  7: "grid-cols-7",
} as const;

export function ChallengePostGrid({
  label,
  columns,
  multiple = false,
  children,
}: {
  label: string;
  columns: keyof typeof COLUMNS;
  multiple?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-label={label}
      className={cn("grid gap-1.5", COLUMNS[columns])}
    >
      {children}
    </div>
  );
}

/** A Team to post as: initials tile, name, sport and Roster; ink when picked. */
export function ChallengePostTeamCard({
  title,
  detail,
  accessibilityLabel,
  selected,
  onSelect,
}: {
  title: string;
  detail: string;
  accessibilityLabel: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={accessibilityLabel}
      onClick={onSelect}
      className={cn(
        "focus-visible:ring-ring/50 flex min-h-16 items-center gap-2.5 rounded-lg border px-3.5 py-3 text-start outline-none transition-colors focus-visible:ring-[3px]",
        selected
          ? "surface-ink border-ink bg-control text-on-control"
          : "border-rule bg-paper text-ink hover:bg-wash",
      )}
    >
      <EntityMonogram
        name={title}
        size="md"
        tone={selected ? "inverse" : "control"}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body truncate font-semibold">{title}</span>
        <span
          className={cn(
            "text-eyebrow",
            selected ? "text-dim" : "text-muted-foreground",
          )}
        >
          {detail}
        </span>
      </span>
    </button>
  );
}

/** Pinned above the tab bar: the step's primary action and its way out. */
export function ChallengePostFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="border-rule bg-background sticky bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] z-10 -mx-4 mt-[26px] flex gap-2.5 border-t px-4 py-3.5 min-[430px]:-mx-5 min-[430px]:px-5 md:mx-0 md:px-0 lg:bottom-0">
      {children}
    </div>
  );
}

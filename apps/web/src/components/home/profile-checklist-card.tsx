"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { SurfaceLabel } from "~/components/common/surface-label";
import { useLocale, useMessages } from "~/components/locale-provider";
import { TaskMarker } from "~/components/onboarding/task-marker";
import { touchHitArea } from "~/components/ui/button";
import { profileChecklistHref, profileTaskHref } from "~/lib/onboarding-step";
import {
  readChecklistSkipped,
  writeChecklistSkipped,
} from "~/lib/profile-checklist-skip";
import { cn } from "~/lib/utils";
import {
  checklistCountLabel,
  homeChecklistAfterSkip,
  homeChecklistRows,
  type ProfileChecklist,
  type ProfileTask,
} from "@repo/domain/profile-checklist";

/** The redirect every task on the Home card carries. */
const HOME_PATH = "/dashboard";

const FOCUS_RING =
  "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset";

function TaskRow({ task }: { task: ProfileTask }) {
  return (
    <li>
      <Link
        href={profileTaskHref(task.id, HOME_PATH)}
        className={cn(
          "hover:bg-wash flex min-h-[52px] items-center gap-3.5 px-[22px] py-3 transition-colors",
          FOCUS_RING,
        )}
      >
        <TaskMarker done={task.done} />
        <span className="min-w-0 flex-1">
          <span className="text-body block truncate font-semibold">
            {task.title}
          </span>
          <span className="text-meta text-muted-foreground block truncate">
            {task.description}
          </span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 rtl:-scale-x-100"
        />
      </Link>
    </li>
  );
}

function Segments({ list }: { list: ProfileChecklist }) {
  return (
    <div aria-hidden="true" className="flex gap-1.5 px-[22px] pb-4">
      {Array.from({ length: list.total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-[3px] flex-1 rounded-full",
            index < list.done ? "bg-ink" : "bg-rule",
          )}
        />
      ))}
    </div>
  );
}

function Count({ list }: { list: ProfileChecklist }) {
  const locale = useLocale();
  return (
    <span className="text-eyebrow font-mono uppercase">
      {checklistCountLabel(list, locale)}
    </span>
  );
}

/**
 * The "Complete your profile" card under the Home header: up to three open
 * tasks, the rest behind "N more tasks". Skip for now collapses it to a chip
 * on this device; a missing name stays as a row regardless (ADR-0049). The
 * card is gone once every task is done.
 */
export function ProfileChecklistCard({ list }: { list: ProfileChecklist }) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webAuth.home.checklist;
  const [skipped, setSkipped] = React.useState(false);

  React.useEffect(() => {
    setSkipped(readChecklistSkipped());
  }, []);

  if (list.complete) {
    return null;
  }

  function setSkip(next: boolean) {
    writeChecklistSkipped(next);
    setSkipped(next);
  }

  if (skipped) {
    const required = homeChecklistAfterSkip(list);
    const names = list.open
      .filter((task) => !task.required)
      .map((task) => copy.shortName[task.id])
      .join(", ");
    return (
      <section
        aria-label={copy.label}
        className="border-rule bg-paper overflow-hidden rounded-xl border"
      >
        <div className="flex min-h-11 items-center justify-between gap-3 px-[18px] py-2">
          <p className="text-meta min-w-0 truncate">
            {copy.profile} <Count list={list} />
            {names ? (
              <span className="text-muted-foreground">{` · ${names}`}</span>
            ) : null}
          </p>
          <button
            type="button"
            className={cn(
              touchHitArea,
              "text-meta text-ink focus-visible:ring-ring/50 shrink-0 rounded-sm font-semibold underline outline-none focus-visible:ring-[3px]",
            )}
            onClick={() => setSkip(false)}
          >
            {copy.show}
          </button>
        </div>
        {required.length > 0 ? (
          <ul className="border-rule divide-rule divide-y border-t">
            {required.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </ul>
        ) : null}
      </section>
    );
  }

  const rows = homeChecklistRows(list, locale);

  return (
    <section
      aria-label={copy.label}
      className="border-rule bg-paper overflow-hidden rounded-xl border"
    >
      <SurfaceLabel meta={<Count list={list} />}>{copy.title}</SurfaceLabel>
      <Segments list={list} />
      <ul className="border-rule divide-rule divide-y border-t">
        {rows.shown.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}
      </ul>
      <div className="border-rule text-meta flex min-h-11 items-center justify-between gap-3 border-t px-[22px] py-2">
        <Link
          href={profileChecklistHref(HOME_PATH)}
          className={cn(
            touchHitArea,
            "text-ink focus-visible:ring-ring/50 flex items-center gap-1.5 rounded-sm font-semibold outline-none focus-visible:ring-[3px]",
          )}
        >
          {rows.more}
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 rtl:-scale-x-100"
          />
        </Link>
        <button
          type="button"
          className={cn(
            touchHitArea,
            "text-muted-foreground focus-visible:ring-ring/50 rounded-sm underline outline-none focus-visible:ring-[3px]",
          )}
          onClick={() => setSkip(true)}
        >
          {copy.skipForNow}
        </button>
      </div>
    </section>
  );
}

"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import { useMessages } from "~/components/locale-provider";
import { buttonVariants } from "~/components/ui/button";
import { CloseButton } from "~/components/ui/nav-icon-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "~/components/ui/sheet";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

import type {
  ProfileSeriesAllRow,
  ProfileSeriesEditionRow,
  ProfileSeriesSheetModel,
} from "./profile-series-model";
import { SeriesBadge } from "./series-badge";

const ROW =
  "flex min-h-[60px] items-center gap-3 px-4 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50";

function WinRow({
  href,
  leading,
  title,
  sub,
}: {
  href: string | null;
  leading: ReactNode;
  title: string;
  sub: string | null;
}) {
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1">
        <span className="text-body block break-words font-semibold">
          {title}
        </span>
        {sub ? (
          <span className="text-eyebrow text-muted-foreground block">
            {sub}
          </span>
        ) : null}
      </span>
      {href ? (
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 rtl:-scale-x-100"
        />
      ) : null}
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className={cn(ROW, "hover:bg-wash")}>
          {body}
        </Link>
      ) : (
        <div className={ROW}>{body}</div>
      )}
    </li>
  );
}

function EditionRow({ row }: { row: ProfileSeriesEditionRow }) {
  return (
    <WinRow
      href={row.href}
      title={row.title}
      sub={row.sub}
      leading={
        <span className="text-eyebrow text-muted-foreground w-[22px] shrink-0 font-mono tabular-nums">
          <span aria-hidden="true" dir="ltr">
            {row.edition}
          </span>
          <span className="sr-only">{row.editionSpoken}</span>
        </span>
      }
    />
  );
}

function AllRow({ row }: { row: ProfileSeriesAllRow }) {
  return (
    <WinRow
      href={row.href}
      title={row.title}
      sub={row.sub}
      leading={
        <SeriesBadge
          emblem={row.emblem}
          colour={row.colour}
          size="line"
          surface="sheet"
        />
      }
    />
  );
}

function Rows({ children }: { children: ReactNode }) {
  return (
    <ul className="border-rule bg-paper rounded-card divide-rule divide-y overflow-hidden border">
      {children}
    </ul>
  );
}

function Heading({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 pb-2.5">
      <h3 className="font-expanded text-title text-ink">{title}</h3>
      <p className="text-meta text-muted-foreground shrink-0">{meta}</p>
    </div>
  );
}

function SeriesBody({
  model,
  error,
  onRetry,
}: {
  model: Extract<ProfileSeriesSheetModel, { mode: "series" }>;
  error: unknown;
  onRetry: () => void;
}) {
  const m = useMessages();
  const { wins } = model;
  if (!wins) {
    return error ? (
      <ErrorState
        variant="inline"
        title={m.series.profile.loadError}
        error={error}
        onRetry={onRetry}
      />
    ) : (
      <div aria-busy="true" className="flex flex-col gap-2.5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="rounded-card h-[120px] w-full" />
      </div>
    );
  }
  return (
    <>
      <div>
        <Heading title={wins.heading} meta={wins.played} />
        <Rows>
          {wins.rows.map((row) => (
            <EditionRow key={row.key} row={row} />
          ))}
        </Rows>
      </div>
      {wins.seeSeries ? (
        <Link
          href={wins.seeSeries.href}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-12 w-full font-semibold",
          )}
        >
          {wins.seeSeries.label}
        </Link>
      ) : null}
    </>
  );
}

/**
 * The bottom sheet over a profile (4b): the wins behind one badge, or every
 * Series win in its all mode. Radix traps focus and closes on Escape; focus
 * goes back to whatever opened it.
 */
export function ProfileSeriesSheet({
  open,
  model,
  error,
  onRetry,
  onClose,
  returnFocus,
}: {
  open: boolean;
  model: ProfileSeriesSheetModel | null;
  error: unknown;
  onRetry: () => void;
  onClose: () => void;
  returnFocus: () => void;
}) {
  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <SheetContent
        side="bottom"
        showCloseButton={false}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          returnFocus();
        }}
        className="mx-auto max-h-[90svh] w-full max-w-[520px] gap-[18px] overflow-y-auto overscroll-contain rounded-t-[22px] border-x-0 border-b-0 px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-3 shadow-none"
      >
        <span
          aria-hidden="true"
          className="bg-rule mx-auto h-1 w-10 shrink-0 rounded-full"
        />
        {model ? (
          <SheetBody
            model={model}
            error={error}
            onRetry={onRetry}
            onClose={onClose}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function SheetBody({
  model,
  error,
  onRetry,
  onClose,
}: {
  model: ProfileSeriesSheetModel;
  error: unknown;
  onRetry: () => void;
  onClose: () => void;
}) {
  const close = (
    <CloseButton variant="boxed" onClick={onClose} className="self-start" />
  );

  if (model.mode === "all") {
    return (
      <>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <SheetTitle className="font-expanded text-h1 leading-[1.05] tracking-[-0.03em]">
              {model.heading}
            </SheetTitle>
            <SheetDescription className="text-meta mt-1.5">
              {model.meta}
            </SheetDescription>
          </div>
          {close}
        </div>
        <Rows>
          {model.rows.map((row) => (
            <AllRow key={row.key} row={row} />
          ))}
        </Rows>
      </>
    );
  }

  const { badge } = model;
  return (
    <>
      <div className="flex items-center gap-4">
        <SeriesBadge
          emblem={badge.emblem}
          colour={badge.colour}
          size="sheet"
          count={badge.wins}
          surface="sheet"
        />
        <div className="min-w-0 flex-1">
          <SheetTitle
            dir="auto"
            className="font-expanded text-h1 break-words leading-[1.05] tracking-[-0.03em]"
          >
            {badge.name}
          </SheetTitle>
          <SheetDescription dir="auto" className="text-meta mt-1.5">
            {badge.groupName ?? ""}
          </SheetDescription>
        </div>
        {close}
      </div>
      <SeriesBody model={model} error={error} onRetry={onRetry} />
    </>
  );
}

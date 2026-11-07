"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { ErrorState } from "~/components/common/error-state";
import { useLocale, useMessages } from "~/components/locale-provider";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import type { CoinKind } from "@repo/domain/marks";
import { isSport, type Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";

import {
  CabinetSkeleton,
  CabinetUnavailable,
  CountFigure,
} from "./cabinet-page";
import {
  cabinetTab,
  markDetailModel,
  type MarkDetailModel,
  type MarkDetailRow,
} from "./cabinet-model";
import { MarkCoin } from "./mark-coin";

function DetailHead({ model }: { model: MarkDetailModel }) {
  return (
    <div className="flex items-center gap-4">
      <MarkCoin kind={model.kind} size="sheet" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2.5">
          <h1 className="font-expanded text-h1">{model.name}</h1>
          <CountFigure
            count={model.count}
            className="text-title text-muted-foreground"
          />
        </div>
        <p className="text-meta text-muted-foreground mt-1.5">
          {model.description}
        </p>
        {model.caption ? (
          <p className="text-eyebrow text-muted-foreground mt-1">
            {model.caption}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DetailRow({ row }: { row: MarkDetailRow }) {
  const m = useMessages();
  const body = (
    <>
      {row.giver ? (
        <UserAvatar name={row.giver.name} image={row.giver.image} size="sm" />
      ) : (
        <MarkCoin kind="mvp" size="roster" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-meta truncate">
          <span className="font-semibold">{row.title}</span>
          {row.relation ? (
            <span className="text-muted-foreground"> {row.relation}</span>
          ) : null}
        </p>
        <p className="text-eyebrow text-muted-foreground truncate">{row.sub}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        {row.score ? (
          <p dir="ltr" className="text-meta font-semibold tabular-nums">
            {row.score}
          </p>
        ) : null}
        <p className="text-eyebrow text-muted-foreground">{row.date}</p>
      </div>
      {row.gameHref ? (
        <>
          <span className="sr-only">{m.profile.matchSheet.openGame}</span>
          <ChevronRight
            aria-hidden="true"
            className="text-muted-foreground -me-1 size-4 shrink-0 rtl:-scale-x-100"
            strokeWidth={2}
          />
        </>
      ) : null}
    </>
  );
  const className = "flex min-h-14 items-center gap-3 px-4 py-3";
  if (!row.gameHref) {
    return <div className={className}>{body}</div>;
  }
  return (
    <Link
      href={row.gameHref}
      className={cn(
        className,
        "hover:bg-wash focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset",
      )}
    >
      {body}
    </Link>
  );
}

/** Mark detail (3b): every Game one kind came from, on one sport's tab. */
export function MarkDetailPage({
  userId,
  kind,
  requestedSport,
}: {
  userId: string;
  kind: CoinKind | null;
  requestedSport?: unknown;
}) {
  const locale = useLocale();
  const m = useMessages();
  const cabinet = api.marks.cabinet.useQuery({ userId });
  const shown = cabinet.data && !cabinet.data.hidden ? cabinet.data : null;
  const sport: Sport | null = isSport(requestedSport)
    ? requestedSport
    : shown
      ? cabinetTab(shown, undefined)
      : null;
  const query = api.marks.kindDetail.useQuery(
    { userId, kind: kind ?? "mvp", sport: sport ?? "padel" },
    { enabled: kind !== null && sport !== null },
  );

  if (
    kind === null ||
    cabinet.data?.hidden ||
    isNotFoundError(query.error) ||
    isNotFoundError(cabinet.error)
  ) {
    return <CabinetUnavailable />;
  }

  const error = query.error ?? (sport === null ? cabinet.error : null);
  if (error) {
    return (
      <ErrorState
        title={m.webMarks.cabinet.loadError}
        message={error.message}
        onRetry={() => {
          void query.refetch();
          void cabinet.refetch();
        }}
      />
    );
  }

  if (!query.data) {
    return <CabinetSkeleton />;
  }

  const model = markDetailModel(query.data, shown?.sports ?? [], locale);

  return (
    <div className="flex flex-col gap-[22px]">
      <DetailHead model={model} />
      {model.empty ? (
        <p className="text-muted-foreground">{model.empty}</p>
      ) : (
        <ul className="border-rule bg-paper rounded-card divide-rule divide-y overflow-hidden border">
          {model.rows.map((row) => (
            <li key={row.key}>
              <DetailRow row={row} />
            </li>
          ))}
        </ul>
      )}
      {model.footer ? (
        <p className="text-eyebrow text-muted-foreground">{model.footer}</p>
      ) : null}
    </div>
  );
}

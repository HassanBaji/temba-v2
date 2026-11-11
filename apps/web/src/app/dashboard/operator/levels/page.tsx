"use client";

import { Gauge } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  SetLevelFields,
  SetLevelMemberSummary,
  type SetLevelMember,
} from "~/components/groups/set-level-form";
import { LevelCell } from "~/components/temba/level-cell";
import { SportSegments } from "~/components/temba/sport-segments";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";
import { levelSliderLabel } from "@repo/domain/level-slider";
import { sportLabel, type Sport } from "@repo/domain/sport";
import type { Messages } from "@repo/i18n/messages";

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function playerMeta(
  player: {
    username: string | null;
    unclaimed: boolean;
    ratedMatchCount: number;
  },
  o: Messages["webDashboard"]["operator"]["levels"],
): React.ReactNode {
  const lead = player.unclaimed ? (
    o.unclaimedPlayer
  ) : player.username ? (
    <bdi dir="ltr">@{player.username}</bdi>
  ) : null;
  const rated = o.ratedMatches(player.ratedMatchCount);
  return lead ? (
    <>
      {lead} · {rated}
    </>
  ) : (
    rated
  );
}

export default function OperatorLevelsPage() {
  const m = useMessages();
  const locale = useLocale();
  const o = m.webDashboard.operator.levels;
  const utils = api.useUtils();
  const [sport, setSport] = React.useState<Sport>("padel");
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const [target, setTarget] = React.useState<SetLevelMember | null>(null);

  const players = api.ratings.listForOperator.useInfiniteQuery(
    { sport, query: debouncedQuery || undefined },
    { getNextPageParam: (page) => page.nextCursor },
  );
  const rows = players.data?.pages.flatMap((page) => page.items) ?? [];

  const setLevel = api.ratings.setLevelAsOperator.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async (_result, variables) => {
      toast.success(
        o.setToast(
          target?.name ?? o.playerFallback,
          levelSliderLabel(variables.levelTenths),
        ),
      );
      setTarget(null);
      await utils.ratings.listForOperator.invalidate();
    },
  });

  function openSetLevel(member: SetLevelMember) {
    setLevel.reset();
    setTarget(member);
  }

  return (
    <DashboardShell title={o.title} description={o.description}>
      <div className="space-y-4">
        <SportSegments value={sport} onSelect={setSport} />

        <Field>
          <FieldLabel htmlFor="operator-player-search">
            {o.searchLabel}
          </FieldLabel>
          <Input
            id="operator-player-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={o.searchPlaceholder}
            maxLength={100}
            autoComplete="off"
          />
        </Field>

        {players.isLoading ? <ListPageSkeleton rows={6} /> : null}

        {players.error ? (
          <ErrorState
            title={o.errorTitle}
            error={players.error}
            onRetry={() => {
              void players.refetch();
            }}
          />
        ) : null}

        {players.data && rows.length === 0 ? (
          <EmptyState
            icon={Gauge}
            title={o.empty.title}
            description={debouncedQuery ? o.empty.tryOther : o.empty.none}
          />
        ) : null}

        {rows.length > 0 ? (
          <RowList>
            {rows.map((player) => (
              <ListRow
                key={player.userId}
                leading={
                  <UserAvatar
                    name={player.name}
                    image={player.image}
                    className="size-10 shrink-0"
                  />
                }
                title={player.name}
                meta={playerMeta(player, o)}
                stackTrailing
                trailing={
                  <div className="flex items-center gap-3">
                    <LevelCell
                      band={player.levelBand}
                      level={player.level}
                      provisional={player.levelProvisional}
                      className="w-16 shrink-0"
                    />
                    {player.isViewer ? (
                      <Badge variant="secondary">{m.common.you}</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openSetLevel(player)}
                      >
                        {m.webDashboard.setLevel.title}
                      </Button>
                    )}
                  </div>
                }
              />
            ))}
          </RowList>
        ) : null}

        {players.hasNextPage ? (
          <Button
            variant="outline"
            disabled={players.isFetchingNextPage}
            onClick={() => {
              void players.fetchNextPage();
            }}
          >
            {m.common.showMore}
          </Button>
        ) : null}
      </div>

      <Sheet
        open={target !== null}
        onOpenChange={(open) => {
          if (!open && !setLevel.isPending) {
            setTarget(null);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-[480px]">
          <SheetHeader>
            <SheetTitle>
              {o.sheetTitle(sportLabel(sport, locale) ?? "")}
            </SheetTitle>
            <SheetDescription>{o.sheetDescription}</SheetDescription>
          </SheetHeader>
          {target ? (
            <div className="flex flex-col gap-5 px-4 pb-6">
              <SetLevelMemberSummary member={target} />
              <SetLevelFields
                key={`${target.userId}:${sport}`}
                member={target}
                pending={setLevel.isPending}
                error={setLevel.error}
                onSubmit={({ levelTenths, reason }) =>
                  setLevel.mutate({
                    userId: target.userId,
                    sport,
                    levelTenths,
                    reason,
                  })
                }
              />
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </DashboardShell>
  );
}

"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CrownIcon,
  PlusIcon,
  XIcon,
} from "lucide-react";
import * as React from "react";

import { formatAbsoluteDay } from "@repo/domain/format-game-start";
import { type TournamentDetails } from "@repo/domain/tournament-details";
import {
  canPostFinalOrder,
  finalOrderStillOpen,
  KING_FINAL_ORDER_MIN,
  kingFinalOrderOf,
  kingFullNames,
  kingPairName,
} from "@repo/domain/tournament-king";
import {
  kingFieldTeams,
  kingFinishedView,
  kingStartingCourtRows,
  kingYourCourt,
  viewerKingTeam,
  type KingFinishedView,
  type KingViewTeam,
} from "@repo/domain/tournament-king-view";

import { PageTitle } from "~/components/layout/page-title";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { ShareButton } from "~/components/ui/nav-icon-button";
import { Surface } from "~/components/ui/surface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useLocale, useMessages } from "~/components/locale-provider";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { pageBleed } from "~/lib/page-layout";
import { cn } from "~/lib/utils";

import { TournamentHeaderBar } from "./tournament-header-bar";
import { shareResultHref } from "./played/played-game-view";
import { FinishedShareLink, PlaceChip } from "./tournament-finished-parts";
import {
  KingCourtCard,
  KingPostedNote,
  KingTeamLine,
  viewerOnTeam,
  type MutationError,
} from "./tournament-king-parts";
import { InitialsMark, ROUND_CARD } from "./tournament-round-parts";

type Tab = "teams" | "courts" | "final";

function hasStarted(windowStart: Date | string | null) {
  return windowStart == null || new Date(windowStart).getTime() <= Date.now();
}

export function TournamentKingHome({
  data,
  backHref,
  actions,
  album,
  onChangeCourts,
  orderPending,
  orderError,
  onPostFinalOrder,
}: {
  data: TournamentDetails;
  backHref: string;
  actions?: React.ReactNode;
  album?: React.ReactNode;
  /** Opens the Starting courts sheet, which the tournament screen owns. */
  onChangeCourts: () => void;
  orderPending: boolean;
  orderError: MutationError;
  onPostFinalOrder: (gameTeamIds: string[]) => Promise<void>;
}) {
  const messages = useMessages();
  const m = messages.tournamentKing;
  const locale = useLocale();
  const teams = React.useMemo(
    () => kingFieldTeams(data.gameTeams),
    [data.gameTeams],
  );
  const orderPosted = data.finalOrderPostedAt != null;
  const organizer = data.isOrganizer && !data.cancelledAt;
  const started = hasStarted(data.windowStart);
  const canEditOrder =
    organizer &&
    started &&
    finalOrderStillOpen(data.finalOrderPostedAt, new Date());
  const [tab, setTab] = React.useState<Tab>(() =>
    orderPosted || (organizer && started) ? "final" : "courts",
  );
  const finished = orderPosted ? kingFinishedView(data, locale) : null;
  const chip = data.isOrganizer
    ? messages.tournamentRounds.organizerChip
    : null;
  const eyebrow = [data.name, data.venue?.name].filter(Boolean).join(", ");

  const titles: Record<Tab, string> = {
    teams: m.tabs.teams,
    courts: m.tabs.courts,
    final: m.tabs.finalOrder,
  };
  const leads: Record<Tab, string> = {
    teams: m.lead.teams,
    courts: m.lead.courts,
    final: orderPosted
      ? m.lead.finalOrderPosted
      : organizer
        ? started
          ? m.lead.finalOrderOrganizer
          : m.lead.finalOrderNotYet
        : m.lead.finalOrderEmpty,
  };

  return (
    <div>
      {finished ? (
        <KingFinishedHeader
          view={finished}
          gameId={data.id}
          backHref={backHref}
          chip={chip}
          actions={actions}
        />
      ) : (
        <Surface
          as="header"
          tone="ink"
          className={cn("pb-[22px] pt-[22px] md:-mt-6", pageBleed)}
        >
          <TournamentHeaderBar surface="ink" backHref={backHref} chip={chip}>
            {actions}
          </TournamentHeaderBar>
          <div className="text-dim text-meta mt-7 flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate">{eyebrow}</p>
            {data.windowStart ? (
              <p className="shrink-0">
                {formatAbsoluteDay(data.windowStart, locale)}
              </p>
            ) : null}
          </div>
          <PageTitle variant="hero" className="mt-1.5">
            {titles[tab]}
          </PageTitle>
          <p className="text-dim text-meta mt-2 leading-relaxed">
            {leads[tab]}
          </p>
        </Surface>
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as Tab)}
        className="gap-0"
      >
        <TabsList
          variant="line"
          aria-label={m.tabs.label}
          className="border-rule border-b"
        >
          <TabsTrigger value="teams">{m.tabs.teams}</TabsTrigger>
          <TabsTrigger value="courts">{m.tabs.courts}</TabsTrigger>
          <TabsTrigger value="final">{m.tabs.finalOrder}</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="pt-[22px]">
          <ol className={cn(ROUND_CARD, "divide-rule divide-y")}>
            {teams.map((team, index) => (
              <li
                key={team.id}
                className={cn(
                  "flex min-h-14 items-center gap-3 px-4 py-3",
                  viewerOnTeam(team, data.viewerUserId) && "bg-wash",
                )}
              >
                <span className="text-muted-foreground text-meta w-5 tabular-nums">
                  {index + 1}
                </span>
                <KingTeamLine team={team} viewerUserId={data.viewerUserId} />
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="courts" className="pt-[22px]">
          <KingCourtsTab
            data={data}
            onChange={organizer && !orderPosted ? onChangeCourts : undefined}
          />
        </TabsContent>

        <TabsContent value="final" className="pt-[22px]">
          {finished && organizer && !canEditOrder ? (
            <div className="pb-4">
              <KingPostedNote
                title={m.finalOrder.posted}
                copy={m.finalOrder.postedFinal}
              />
            </div>
          ) : null}
          {canEditOrder ? (
            <KingFinalOrderEditor
              key={String(data.finalOrderPostedAt ?? "draft")}
              teams={teams}
              viewerUserId={data.viewerUserId}
              posted={orderPosted}
              pending={orderPending}
              error={orderError}
              onPost={onPostFinalOrder}
            />
          ) : finished ? (
            <KingFinalOrderList
              view={finished}
              viewerUserId={data.viewerUserId}
            />
          ) : (
            <p className="text-muted-foreground text-meta leading-relaxed">
              {leads.final}
            </p>
          )}
        </TabsContent>
      </Tabs>

      {album ? <div className="pt-[26px] empty:hidden">{album}</div> : null}

      {finished ? (
        <div className="pt-6">
          <FinishedShareLink
            gameId={data.id}
            label={messages.tournamentRounds.finished.shareYourDay}
          />
        </div>
      ) : null}
    </div>
  );
}

/** 2c: where the viewer starts, then every starting court. */
function KingCourtsTab({
  data,
  onChange,
}: {
  data: TournamentDetails;
  onChange?: () => void;
}) {
  const m = useMessages().tournamentKing;
  const locale = useLocale();
  const yourCourt = kingYourCourt(data);
  const viewerTeam = viewerKingTeam(data.gameTeams, data.viewerUserId);
  const rows = kingStartingCourtRows(data);
  return (
    <div className="space-y-[26px]">
      {yourCourt && viewerTeam ? (
        <div className={cn(ROUND_CARD, "bg-paper")}>
          <div className="px-[18px] py-4">
            <p className="text-muted-foreground text-eyebrow">
              {m.yourCourt.startOn(
                kingPairName(viewerTeam.members, data.viewerUserId, locale),
              )}
            </p>
            <p className="font-expanded mt-1 text-[40px] leading-none tracking-[-0.03em]">
              {m.court.name(yourCourt.court)}
            </p>
            {yourCourt.opponent ? (
              <p className="text-body mt-2">
                {m.yourCourt.against}{" "}
                <span dir="auto" className="font-semibold">
                  {kingFullNames(yourCourt.opponent.members)}
                </span>
              </p>
            ) : null}
          </div>
          <div className="border-rule text-meta flex flex-col gap-2 border-t px-[18px] py-3">
            <p className="flex items-center gap-2.5">
              <ArrowUpIcon aria-hidden="true" className="size-4 shrink-0" />
              <span>
                {yourCourt.win.stays ? m.yourCourt.winStay : m.yourCourt.winUp}{" "}
                <span className="font-semibold">
                  {m.court.name(yourCourt.win.court)}
                </span>
              </span>
            </p>
            <p className="flex items-center gap-2.5">
              <ArrowDownIcon aria-hidden="true" className="size-4 shrink-0" />
              <span>
                {yourCourt.lose.stays
                  ? m.yourCourt.loseStay
                  : m.yourCourt.loseDown}{" "}
                <span className="font-semibold">
                  {m.court.name(yourCourt.lose.court)}
                </span>
              </span>
            </p>
          </div>
        </div>
      ) : null}

      <section>
        <div className="flex items-baseline justify-between gap-3 pb-2.5">
          <h2 className="font-expanded text-title tracking-[-0.03em]">
            {m.startingCourts.title}
          </h2>
          <p className="text-muted-foreground text-meta">
            {m.startingCourts.meta}
          </p>
        </div>
        <div className="space-y-2.5">
          {rows.map((row) => (
            <KingCourtCard key={row.court} court={row.court} tag={row.tag}>
              {row.teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <KingTeamLine team={team} viewerUserId={data.viewerUserId} />
                </div>
              ))}
            </KingCourtCard>
          ))}
        </div>
        <p className="text-muted-foreground text-eyebrow mt-2 leading-relaxed">
          {m.startingCourts.footer}
        </p>
        {onChange ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4 min-h-11 w-full font-semibold"
            onClick={onChange}
          >
            {m.startingCourts.changeCourts}
          </Button>
        ) : null}
      </section>
    </div>
  );
}

/** 3a: tap teams in finishing order; the arrow moves one up, the cross takes it out. */
function KingFinalOrderEditor({
  teams,
  viewerUserId,
  posted,
  pending,
  error,
  onPost,
}: {
  teams: readonly KingViewTeam[];
  viewerUserId: string;
  posted: boolean;
  pending: boolean;
  error: MutationError;
  onPost: (gameTeamIds: string[]) => Promise<void>;
}) {
  const m = useMessages().tournamentKing.finalOrder;
  const byId = React.useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );
  const [placedIds, setPlacedIds] = React.useState<string[]>(() =>
    kingFinalOrderOf(teams).placed.map((team) => team.id),
  );
  const [editing, setEditing] = React.useState(!posted);
  const left = teams.filter((team) => !placedIds.includes(team.id));
  const canPost = canPostFinalOrder(placedIds.length, teams.length);

  async function post() {
    try {
      await onPost(placedIds);
      setEditing(false);
    } catch {
      return;
    }
  }

  return (
    <div className="space-y-[26px]">
      <section>
        <div className="flex items-baseline justify-between gap-3 pb-2.5">
          <h2 className="font-expanded text-title tracking-[-0.03em]">
            {m.title}
          </h2>
          <p className="text-muted-foreground text-meta">
            {m.placed(placedIds.length, teams.length)}
          </p>
        </div>
        {placedIds.length === 0 ? (
          <p className="border-rule rounded-card text-muted-foreground text-meta border border-dashed px-4 py-5 text-center">
            {m.nobody}
          </p>
        ) : (
          <ol className={cn(ROUND_CARD, "divide-rule divide-y")}>
            {placedIds.map((teamId, index) => {
              const team = byId.get(teamId);
              if (!team) {
                return null;
              }
              return (
                <li
                  key={teamId}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5",
                    viewerOnTeam(team, viewerUserId) && "bg-wash",
                  )}
                >
                  <PlaceChip place={index + 1} />
                  <span className="min-w-0 flex-1">
                    <KingTeamLine team={team} viewerUserId={viewerUserId} />
                    {index === 0 ? (
                      <span className="text-muted-foreground text-eyebrow mt-0.5 flex items-center gap-1.5 ps-12">
                        <CrownIcon aria-hidden="true" className="size-3" />
                        {m.king}
                      </span>
                    ) : null}
                  </span>
                  {editing ? (
                    <span className="flex shrink-0 gap-1.5">
                      {index > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label={m.moveUp(kingFullNames(team.members))}
                          onClick={() =>
                            setPlacedIds((current) => {
                              const next = [...current];
                              next[index - 1] = teamId;
                              next[index] = current[index - 1] ?? teamId;
                              return next;
                            })
                          }
                        >
                          <ArrowUpIcon aria-hidden="true" className="size-4" />
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={m.takeOut(kingFullNames(team.members))}
                        onClick={() =>
                          setPlacedIds((current) =>
                            current.filter((id) => id !== teamId),
                          )
                        }
                      >
                        <XIcon aria-hidden="true" className="size-4" />
                      </Button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {editing && left.length > 0 ? (
        <section>
          <div className="flex items-baseline justify-between gap-3 pb-2.5">
            <h2 className="font-expanded text-title tracking-[-0.03em]">
              {m.stillToPlace}
            </h2>
            <p className="text-muted-foreground text-meta">
              {m.nextTap(placedIds.length + 1)}
            </p>
          </div>
          <ul className={cn(ROUND_CARD, "divide-rule divide-y")}>
            {left.map((team) => (
              <li key={team.id}>
                <button
                  type="button"
                  aria-label={m.place(kingFullNames(team.members))}
                  onClick={() =>
                    setPlacedIds((current) => [...current, team.id])
                  }
                  className="hover:bg-wash focus-visible:ring-ink flex w-full items-center gap-3 px-4 py-2.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset"
                >
                  <KingTeamLine team={team} viewerUserId={viewerUserId} />
                  <PlusIcon aria-hidden="true" className="size-4 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!editing && left.length > 0 ? (
        <p className="text-muted-foreground text-meta">
          {m.unplaced(left.length)}
        </p>
      ) : null}

      <div className="border-rule space-y-2 border-t pt-4">
        <FormErrorSummary message={globalFormErrorMessage(error)} />
        {editing ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-12 flex-none px-5"
              disabled={pending || placedIds.length === 0}
              onClick={() => setPlacedIds([])}
            >
              {m.clear}
            </Button>
            <Button
              type="button"
              size="lg"
              className="flex-1 font-semibold"
              disabled={!canPost || pending}
              aria-busy={pending}
              onClick={() => void post()}
            >
              {pending
                ? m.posting
                : canPost
                  ? m.post
                  : m.placeTop(Math.min(KING_FINAL_ORDER_MIN, teams.length))}
            </Button>
          </div>
        ) : (
          <KingPostedNote
            title={m.posted}
            copy={m.postedCanChange}
            changeLabel={m.change}
            onChange={() => setEditing(true)}
          />
        )}
      </div>
    </div>
  );
}

/** 3b: the whole order, the king crowned, teams left out at the bottom. */
function KingFinalOrderList({
  view,
  viewerUserId,
}: {
  view: KingFinishedView;
  viewerUserId: string;
}) {
  const m = useMessages().tournamentKing.finalOrder;
  return (
    <div>
      <div
        aria-hidden="true"
        className="text-muted-foreground text-eyebrow flex items-center gap-3 px-4 pb-2"
      >
        <span className="w-6 text-center">{m.numberHeader}</span>
        <span>{m.teamHeader}</span>
      </div>
      <ol
        aria-label={m.listLabel}
        className={cn(ROUND_CARD, "divide-rule divide-y")}
      >
        {view.order.map((row) => (
          <li
            key={row.team.id}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5",
              row.isViewer && "bg-wash",
            )}
          >
            {row.place != null ? (
              <PlaceChip place={row.place} />
            ) : (
              <span
                aria-label={m.notPlaced}
                className="text-muted-foreground text-meta inline-flex size-6 shrink-0 items-center justify-center"
              >
                –
              </span>
            )}
            <KingTeamLine team={row.team} viewerUserId={viewerUserId} />
            {row.place === 1 ? (
              <CrownIcon aria-hidden="true" className="size-4 shrink-0" />
            ) : null}
          </li>
        ))}
      </ol>
      <p className="text-muted-foreground text-eyebrow mt-2">{m.note}</p>
    </div>
  );
}

/** 3b: a white header, the king first and then the viewer's place. */
function KingFinishedHeader({
  view,
  gameId,
  backHref,
  chip,
  actions,
}: {
  view: KingFinishedView;
  gameId: string;
  backHref: string;
  chip: string | null;
  actions?: React.ReactNode;
}) {
  const shareLabel = useMessages().tournamentRounds.finished.shareYourDay;
  return (
    <Surface
      as="header"
      tone="paper"
      className={cn("pb-[22px] pt-[22px] md:-mt-6", pageBleed)}
    >
      <TournamentHeaderBar surface="paper" backHref={backHref} chip={chip}>
        <ShareButton
          variant="boxed"
          surface="paper"
          href={shareResultHref(gameId)}
          label={shareLabel}
        />
        {actions}
      </TournamentHeaderBar>
      {view.dateLine ? (
        <p className="text-muted-foreground text-meta mt-7">{view.dateLine}</p>
      ) : null}
      <PageTitle variant="hero" className="mt-1.5">
        {view.name}
      </PageTitle>
      <p className="text-muted-foreground text-meta mt-2 leading-relaxed">
        {view.summary}
      </p>
      {view.podium.length > 0 ? (
        <ol
          aria-label={view.podiumLabel}
          className={cn(ROUND_CARD, "divide-rule bg-paper mt-5 divide-y")}
        >
          {view.podium.map((row) => (
            <li
              key={row.gameTeamId}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5",
                row.isViewer && "bg-wash",
              )}
            >
              <PlaceChip place={row.place} />
              <InitialsMark
                name={row.markName}
                isViewer={row.isViewer}
                className="text-meta size-11"
              />
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground text-meta">
                  {row.smallLine}
                </p>
                <p
                  dir="auto"
                  className="text-[16px] font-semibold leading-snug tracking-[-0.01em]"
                >
                  {row.mainLine}
                </p>
                {row.detailLine ? (
                  <p className="text-muted-foreground text-meta">
                    {row.detailLine}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </Surface>
  );
}

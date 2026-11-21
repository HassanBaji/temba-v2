"use client";

import { bibColors, colors } from "@repo/design-tokens";
import {
  boardTierCell,
  clearSides,
  draftSummary,
  initialTeamsDraft,
  keeperWord,
  moveAcross,
  ovrLabel,
  placeOn,
  setSideCaptain,
  shortName,
  shuffleSides,
  slotCode,
  switchMethod,
  teamsSideAverage,
  type BoardPlayer,
  type Side,
  type TeamsDraft,
} from "@repo/domain/football-board";
import {
  type FootballBib,
  type FootballTeamsMethod,
} from "@repo/domain/football-lineup";
import { isFootballRosterGame } from "@repo/domain/football-game-details";
import { footballDraftSaveProblem } from "@repo/domain/football-draft";
import { formatGameStart } from "@repo/domain/format-game-start";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Eraser,
  Shuffle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { NicknameName } from "~/components/temba/nickname-name";
import { ErrorState } from "~/components/common/error-state";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

import { BibChip, BibPicker, bibStyle } from "./football-bibs";
import { FootballCaptainsDialog } from "./football-captains-dialog";
import { BibRow, CaptainAvatar, TierMark } from "./football-team-columns";

/** The Member nickname when the viewer may see one, else the full Temba name. */
function teamsName(player: Pick<BoardPlayer, "name" | "nickname">) {
  return player.nickname?.name ?? player.name;
}

// Captain pick is set up on the mobile App until the web Pick room exists.
const WEB_TEAMS_METHODS = ["level", "manual"] as const;

function MethodToggle({
  method,
  onChange,
}: {
  method: FootballTeamsMethod;
  onChange: (method: FootballTeamsMethod) => void;
}) {
  const m = useMessages();
  return (
    <div
      role="radiogroup"
      aria-label={m.webTournament.footballTeams.howToMakeTeams}
      className="border-rule flex overflow-hidden rounded-lg border"
    >
      {WEB_TEAMS_METHODS.map((value) => {
        const selected = value === method;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(value)}
            className={cn(
              "text-meta focus-visible:ring-ring/50 h-10 flex-1 outline-none focus-visible:ring-[3px]",
              selected
                ? "bg-control text-on-control font-semibold"
                : "bg-paper text-muted-foreground hover:bg-wash",
            )}
          >
            {m.webTournament.footballTeams.method[value]}
          </button>
        );
      })}
    </div>
  );
}

function barColor(bib: FootballBib) {
  const fill = bibColors[bib].fill;
  return fill === colors.paper ? colors.inputBorder : fill;
}

function BalanceCard({
  draft,
  summary,
  canSaveDraft,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  canSaveDraft: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const t = m.webTournament.footballTeams;
  const row = (side: Side) => {
    const bib = side === 1 ? draft.bibs.slot1 : draft.bibs.slot2;
    const members = side === 1 ? summary.slot1 : summary.slot2;
    const name = side === 1 ? summary.names.slot1 : summary.names.slot2;
    const share = Math.min(1, members.length / Math.max(1, summary.teamSize));
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <BibChip bib={bib} className="size-4" />
          <span className="font-semibold">{name}</span>
          <span className="text-muted-foreground text-meta flex-1">
            {t.avgAndKeepers(
              teamsSideAverage(members, locale, summary.balanceOn),
              keeperWord(members, locale),
            )}
          </span>
          <span className="font-expanded tabular-nums">
            {draft.method === "manual"
              ? t.countOfTeamSize(members.length, summary.teamSize)
              : members.length}
          </span>
        </div>
        <div className="bg-wash h-1.5 overflow-hidden rounded-full">
          <div
            className="h-full"
            style={{
              width: `${Math.round(share * 100)}%`,
              backgroundColor: barColor(bib),
            }}
          />
        </div>
      </div>
    );
  };
  return (
    <section className="border-rule bg-paper space-y-3 rounded-xl border p-5">
      {row(1)}
      {row(2)}
      <p aria-live="polite" className="text-muted-foreground text-meta">
        {summary.problem ??
          (canSaveDraft
            ? t.readyToPublishOrDraft(summary.note)
            : t.readyToPublish(summary.note))}
      </p>
    </section>
  );
}

function isSideCaptain(
  draft: TeamsDraft,
  side: Side | undefined,
  userId: string,
) {
  return (
    side != null &&
    (side === 1 ? draft.captains.slot1 : draft.captains.slot2) === userId
  );
}

function CaptainChip({
  side,
  team,
  captain,
  onOpen,
}: {
  side: Side;
  team: string;
  captain: BoardPlayer | null;
  onOpen: (side: Side) => void;
}) {
  const m = useMessages();
  const copy = m.football.captains;
  const name = captain
    ? captain.isViewer
      ? m.common.you
      : (captain.nickname?.name ?? shortName(captain.name))
    : null;
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={copy.chipSpoken(team, name)}
      onClick={() => onOpen(side)}
      className={cn(
        "focus-visible:ring-ring/50 flex h-[42px] min-w-0 flex-1 items-center gap-2 rounded-md border px-2.5 text-start outline-none focus-visible:ring-[3px]",
        captain ? "border-rule" : "border-input border-dashed",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border text-[9px] font-semibold leading-none",
          captain
            ? "bg-control text-on-control border-control-edge"
            : "bg-paper text-muted-foreground border-input",
        )}
      >
        {copy.badge}
      </span>
      <span
        className={cn(
          "text-meta min-w-0 flex-1 truncate",
          captain ? null : "text-muted-foreground",
        )}
      >
        {name ?? copy.add}
      </span>
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground size-3.5 shrink-0"
      />
    </button>
  );
}

/** "Captains, optional, one per team": a chip per side opens the dialog. */
function CaptainsRow({
  draft,
  players,
  names,
  onOpen,
}: {
  draft: TeamsDraft;
  players: readonly BoardPlayer[];
  names: { slot1: string; slot2: string };
  onOpen: (side: Side) => void;
}) {
  const m = useMessages().football.captains;
  const captain = (userId: string | null) =>
    players.find((player) => player.userId === userId) ?? null;
  return (
    <section className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-muted-foreground text-meta">{m.title}</h2>
        <span className="text-muted-foreground text-eyebrow">{m.optional}</span>
      </div>
      <div className="flex gap-2.5">
        <CaptainChip
          side={1}
          team={names.slot1}
          captain={captain(draft.captains.slot1)}
          onOpen={onOpen}
        />
        <CaptainChip
          side={2}
          team={names.slot2}
          captain={captain(draft.captains.slot2)}
          onOpen={onOpen}
        />
      </div>
    </section>
  );
}

function LevelColumns({
  draft,
  summary,
  onMove,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  onMove: (userId: string) => void;
}) {
  const m = useMessages();
  const column = (side: Side) => {
    const bib = side === 1 ? draft.bibs.slot1 : draft.bibs.slot2;
    const members = side === 1 ? summary.slot1 : summary.slot2;
    const Icon = side === 1 ? ArrowRight : ArrowLeft;
    const { fill, on } = bibColors[bib];
    return (
      <ul className="min-w-0 flex-1 space-y-2">
        {members.map((player) => (
          <li key={player.userId}>
            <BibRow
              player={player}
              bib={bib}
              showTier
              sideCaptain={isSideCaptain(draft, side, player.userId)}
              trailing={
                <button
                  type="button"
                  aria-label={m.webTournament.footballTeams.moveToOtherTeam(
                    teamsName(player),
                  )}
                  onClick={() => onMove(player.userId)}
                  className="focus-visible:ring-ring/50 flex size-[26px] shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
                  style={{ backgroundColor: on, color: fill }}
                >
                  <Icon
                    aria-hidden="true"
                    className="size-3.5 rtl:-scale-x-100"
                  />
                </button>
              }
            />
          </li>
        ))}
      </ul>
    );
  };
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {column(1)}
        {column(2)}
      </div>
      <p className="text-muted-foreground text-meta">
        {m.webTournament.footballTeams.noSubsNote}
      </p>
    </div>
  );
}

function SwatchButton({
  bib,
  selected,
  label,
  onClick,
}: {
  bib: FootballBib;
  selected: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "focus-visible:ring-ring/50 size-[34px] shrink-0 rounded-sm border-2 p-0.5 outline-none focus-visible:ring-[3px]",
        selected ? "border-current" : "border-transparent",
      )}
    >
      <span
        className={cn(
          "block size-full rounded-[4px] border",
          !selected && "opacity-55",
        )}
        style={bibStyle(bib)}
      />
    </button>
  );
}

function ManualRow({
  player,
  draft,
  names,
  onPlace,
}: {
  player: BoardPlayer;
  draft: TeamsDraft;
  names: { slot1: string; slot2: string };
  onPlace: (side: Side) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const side = draft.sides[player.userId];
  const bib =
    side === 1 ? draft.bibs.slot1 : side === 2 ? draft.bibs.slot2 : null;
  const code = slotCode(player, locale);
  const tierCell = boardTierCell(player, locale);
  return (
    <li
      className={cn(
        "flex items-center gap-2.5 rounded-md border px-2.5 py-1.5",
        bib ? null : "bg-paper border-input border-dashed",
      )}
      style={bib ? bibStyle(bib) : undefined}
    >
      <CaptainAvatar
        player={player}
        bib={bib}
        sideCaptain={isSideCaptain(draft, side, player.userId)}
      />
      <div className="min-w-0 flex-1">
        <NicknameName
          name={player.isViewer ? m.common.you : teamsName(player)}
          isNickname={!player.isViewer && player.nickname != null}
          className="[text-align:match-parent]"
        />
        {code ? (
          <p className="font-mono text-[11px] opacity-70">{code}</p>
        ) : null}
      </div>
      {tierCell ? (
        <TierMark cell={tierCell} />
      ) : (
        <span dir="ltr" className="font-expanded">
          {ovrLabel(player)}
        </span>
      )}
      <SwatchButton
        bib={draft.bibs.slot1}
        selected={side === 1}
        label={m.webTournament.footballTeams.putIn(
          teamsName(player),
          names.slot1,
        )}
        onClick={() => onPlace(1)}
      />
      <SwatchButton
        bib={draft.bibs.slot2}
        selected={side === 2}
        label={m.webTournament.footballTeams.putIn(
          teamsName(player),
          names.slot2,
        )}
        onClick={() => onPlace(2)}
      />
    </li>
  );
}

function ManualLists({
  draft,
  summary,
  onPlace,
}: {
  draft: TeamsDraft;
  summary: ReturnType<typeof draftSummary>;
  onPlace: (userId: string, side: Side) => void;
}) {
  const m = useMessages();
  const t = m.webTournament.footballTeams;
  const group = (
    key: string,
    title: React.ReactNode,
    meta: string,
    members: readonly BoardPlayer[],
  ) =>
    members.length > 0 ? (
      <section key={key} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold">{title}</h2>
          <span className="text-muted-foreground text-meta">{meta}</span>
        </div>
        <ul className="space-y-2">
          {members.map((player) => (
            <ManualRow
              key={player.userId}
              player={player}
              draft={draft}
              names={summary.names}
              onPlace={(side) => onPlace(player.userId, side)}
            />
          ))}
        </ul>
      </section>
    ) : null;
  return (
    <div className="space-y-5">
      {group(
        "unplaced",
        t.notPlaced,
        t.leftCount(summary.unplaced.length),
        summary.unplaced,
      )}
      {group(
        "slot1",
        <>
          <BibChip bib={draft.bibs.slot1} className="size-3.5" />
          {summary.names.slot1}
        </>,
        t.countOfTeamSize(summary.slot1.length, summary.teamSize),
        summary.slot1,
      )}
      {group(
        "slot2",
        <>
          <BibChip bib={draft.bibs.slot2} className="size-3.5" />
          {summary.names.slot2}
        </>,
        t.countOfTeamSize(summary.slot2.length, summary.teamSize),
        summary.slot2,
      )}
    </div>
  );
}

/**
 * The Organizer splits the pool into two teams, by Level or by hand, picks
 * each team's bib colour and publishes, or saves the split as the Game's
 * Draft line-up while the teams are not published, with a Side captain per
 * team or none. Opened from a draft, it starts from it and names it on save
 * and publish. The captains are always sent, so clearing one clears it.
 */
export function FootballMakeTeams({ gameId }: { gameId: string }) {
  const m = useMessages();
  const locale = useLocale();
  const t = m.webTournament.footballTeams;
  const router = useRouter();
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id: gameId });
  const isFootball = game.data ? isFootballRosterGame(game.data) : null;
  const board = api.games.footballBoard.useQuery(
    { gameId },
    { enabled: isFootball === true },
  );
  const [draft, setDraft] = React.useState<TeamsDraft | null>(null);
  const [openedFromDraftAt, setOpenedFromDraftAt] = React.useState<Date | null>(
    null,
  );
  const [captainsSide, setCaptainsSide] = React.useState<Side | null>(null);
  const gameHref = `/dashboard/games/${gameId}`;

  React.useEffect(() => {
    if (isFootball === false) {
      router.replace(gameHref);
    }
  }, [isFootball, router, gameHref]);

  React.useEffect(() => {
    if (board.data && draft == null) {
      setDraft(
        initialTeamsDraft(
          board.data.players,
          board.data.teams,
          board.data.draft,
        ),
      );
      setOpenedFromDraftAt(board.data.draft?.updatedAt ?? null);
    }
  }, [board.data, draft]);

  const closeWith = async (message: string) => {
    toast.success(message);
    await Promise.all([
      utils.games.footballBoard.invalidate({ gameId }),
      utils.games.byId.invalidate({ id: gameId }),
      utils.games.listMyGames.invalidate(),
    ]);
    router.push(gameHref);
  };
  const refetchBoard = () => utils.games.footballBoard.invalidate({ gameId });

  const publish = api.games.publishFootballTeams.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: () => closeWith(t.publishedToast),
    onError: refetchBoard,
  });
  const saveDraft = api.games.saveFootballDraft.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: () => closeWith(t.draftSavedToast),
    onError: refetchBoard,
  });

  const players = board.data?.players ?? [];
  const summary = draft
    ? draftSummary(draft, players, locale, board.data?.balanceOn)
    : null;
  const back = (
    <Button variant="outline" asChild>
      <Link href={gameHref}>{m.webTournament.backToGame}</Link>
    </Button>
  );

  let body: React.ReactNode;
  if (board.error) {
    body = (
      <ErrorState
        title={t.poolLoadFailed}
        error={board.error}
        onRetry={() => void board.refetch()}
      />
    );
  } else if (board.data && !board.data.viewer.canMakeTeams) {
    body = (
      <section className="border-rule bg-paper space-y-1 rounded-xl border p-5">
        <h2 className="font-semibold">{t.fixedTitle}</h2>
        <p className="text-muted-foreground text-meta">{t.fixedBody}</p>
      </section>
    );
  } else if (!draft || !summary) {
    body = <Skeleton className="h-80 w-full rounded-xl" />;
  } else {
    const start = game.data?.windowStart ?? null;
    const sideSize = game.data?.sideSize ?? null;
    const intro = [
      start ? formatGameStart(start, locale) : null,
      sideSize
        ? t.perTeamStart(summary.teamSize, sideSize)
        : t.perTeam(summary.teamSize),
    ]
      .filter(Boolean)
      .join(". ");
    const canSaveDraft = board.data?.viewer.canSaveDraft ?? false;
    const sides = {
      method: draft.method,
      bibs: draft.bibs,
      slot1: summary.slot1.map((player) => player.userId),
      slot2: summary.slot2.map((player) => player.userId),
      captains: draft.captains,
    };
    const saveProblem = footballDraftSaveProblem(
      sides,
      players.map((player) => player.userId),
      locale,
    );
    const refusal = publish.error ?? saveDraft.error;
    const toolLabel = canSaveDraft ? "max-sm:sr-only" : undefined;
    body = (
      <div className="space-y-5">
        <p className="text-muted-foreground text-meta">
          {intro}. {draft.method === "level" ? t.levelHint : t.manualHint}
        </p>
        <MethodToggle
          method={draft.method}
          onChange={(method) => setDraft(switchMethod(draft, method, players))}
        />
        <BibPicker
          bibs={draft.bibs}
          onChange={(bibs) => setDraft({ ...draft, bibs })}
        />
        <BalanceCard
          draft={draft}
          summary={summary}
          canSaveDraft={canSaveDraft}
        />
        <CaptainsRow
          draft={draft}
          players={players}
          names={summary.names}
          onOpen={setCaptainsSide}
        />
        {draft.method === "level" ? (
          <LevelColumns
            draft={draft}
            summary={summary}
            onMove={(userId) => setDraft(moveAcross(draft, userId))}
          />
        ) : (
          <ManualLists
            draft={draft}
            summary={summary}
            onPlace={(userId, side) => setDraft(placeOn(draft, userId, side))}
          />
        )}
        {refusal ? (
          <p role="alert" className="text-destructive text-meta">
            {refusal.message}
          </p>
        ) : null}
        <div className="border-rule bg-background sticky bottom-0 flex gap-2 border-t py-4">
          {draft.method === "level" ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() =>
                setDraft(shuffleSides(draft, players, Math.random))
              }
            >
              <Shuffle aria-hidden="true" />
              <span className={toolLabel}>{t.shuffle}</span>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setDraft(clearSides(draft))}
            >
              {canSaveDraft ? <Eraser aria-hidden="true" /> : null}
              <span className={toolLabel}>{m.common.clear}</span>
            </Button>
          )}
          {canSaveDraft ? (
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={saveProblem != null || publish.isPending}
              pending={saveDraft.isPending}
              onClick={() =>
                saveDraft.mutate({
                  gameId,
                  ...sides,
                  draftUpdatedAt: openedFromDraftAt ?? undefined,
                })
              }
            >
              {t.saveDraft}
            </Button>
          ) : null}
          <Button
            type="button"
            size="lg"
            className="flex-1"
            disabled={summary.problem != null || saveDraft.isPending}
            pending={publish.isPending}
            onClick={() =>
              publish.mutate({
                gameId,
                ...sides,
                draftUpdatedAt: openedFromDraftAt ?? undefined,
              })
            }
          >
            {t.publish}
          </Button>
        </div>
        <FootballCaptainsDialog
          side={captainsSide}
          bibs={draft.bibs}
          names={summary.names}
          sides={{ slot1: summary.slot1, slot2: summary.slot2 }}
          captains={draft.captains}
          onSideChange={setCaptainsSide}
          onPick={(side, userId) =>
            setDraft(setSideCaptain(draft, side, userId))
          }
          onClose={() => setCaptainsSide(null)}
        />
      </div>
    );
  }

  return (
    <DashboardShell
      title={draft?.method === "manual" ? t.manualTitle : t.makeTeams}
      description={t.inThePool(players.length)}
      action={back}
      isSubPage
      hideNav
    >
      {body}
    </DashboardShell>
  );
}

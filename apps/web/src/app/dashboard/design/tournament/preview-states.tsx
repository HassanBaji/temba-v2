"use client";

import { useRef, useState } from "react";

import { StepperField } from "~/components/games/stepper-field";
import { TournamentDetailRows } from "~/components/games/tournament-detail-rows";
import { TournamentHome } from "~/components/games/tournament-home";
import { KingPlayedCard } from "~/components/games/tournament-king-played-card";
import { ScaledCanvas } from "~/components/share-result/scaled-canvas";
import {
  TOURNAMENT_CARD_SIZE,
  TournamentShareCard,
} from "~/components/share-result/tournament-share-card";
import {
  HomeTournamentMatchCard,
  TournamentMatchCard,
  TournamentSummaryCard,
} from "~/components/games/tournament-summary-card";
import { buttonVariants } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { TournamentFixture } from "@repo/domain/tournament-details-fixtures";
import type { createKingTournamentFixtures } from "@repo/domain/tournament-king-fixtures";
import { kingPlayedSummary } from "@repo/domain/tournament-king-view";
import type {
  TournamentCardFixture,
  TournamentCardFixtures,
} from "@repo/domain/tournament-card-fixtures";
import { formatGameClock } from "@repo/domain/format-game-start";
import { zonedDateTimeToInstant } from "@repo/domain/product-timezone";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import type { TournamentMatchPhase } from "@repo/domain/tournament-card";
import { tournamentShareCard } from "@repo/domain/tournament-finished";
import {
  courtCountValue,
  defaultPoolCount,
  formatMatchesPerTeam,
  formatPoolSizeLine,
  lastMatchFinishCopy,
  oneDayFit,
  playersInPairsLine,
  poolCountOptions,
  sizeFriendlyTournament,
  tournamentMatchMinutes,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
  TOURNAMENT_TEAM_STEP,
} from "@repo/domain/tournament-sizing";
import { messagesFor } from "@repo/i18n/messages";
import { sizeTournamentRounds } from "@repo/domain/tournament-schedule";
import { cn } from "~/lib/utils";

import {
  previewRoundsActions,
  roundsPreviewData,
  type RoundsPreviewVariant,
} from "./rounds-preview";

const FIELD_LABEL = "text-muted-foreground text-meta font-normal";

const PREVIEW = messagesFor("en");
const COUNTS_FOR_RATING_LABEL = PREVIEW.tournament.home.countsForRating;
const COUNTS_FOR_RATING_YES = PREVIEW.common.yes;
const PRICE_ROW_LABEL = PREVIEW.tournament.home.priceRow;
const DRAW_RANDOM_VALUE = PREVIEW.tournament.join.drawRandom;
const DRAW_ROW_LABEL = PREVIEW.tournament.join.drawRow;
const PRICE_PER_PLAYER_JOIN_SUFFIX = PREVIEW.tournament.join.pricePerPlayer;
const ROUNDS_ROW_LABEL = PREVIEW.tournament.join.roundsRow;
const ALONE_OR_WITH_A_PARTNER_LABEL =
  PREVIEW.tournament.sizing.aloneOrWithPartner;
const ANYONE_WITH_THE_LINK_LABEL = PREVIEW.tournament.sizing.anyoneWithTheLink;
const COURTS_ROW_LABEL = PREVIEW.tournament.sizing.courtsRow;
const CREATE_FOOTER_COPY = PREVIEW.tournament.sizing.createFooter;
const CREATE_PRIMARY_ACTION = PREVIEW.tournament.sizing.createPrimaryAction;
const CREATE_SUBLINE = PREVIEW.tournament.sizing.createSubline;
const CREATE_TOURNAMENT_HEADING_LEAD =
  PREVIEW.tournament.sizing.createHeadingLead;
const CREATE_TOURNAMENT_HEADING_TRAIL =
  PREVIEW.tournament.sizing.createHeadingTrail;
const EACH_MATCH_ROW_LABEL = PREVIEW.tournament.sizing.eachMatchRow;
const HOW_PEOPLE_JOIN_LABEL = PREVIEW.tournament.sizing.howPeopleJoin;
const MATCHES_PER_TEAM_ROW_LABEL = PREVIEW.tournament.sizing.matchesPerTeamRow;
const ONE_DAY_CALLOUT_LABEL = PREVIEW.tournament.sizing.oneDayCallout;
const ONE_DAY_OVERRUN_MESSAGE = PREVIEW.tournament.sizing.oneDayOverrun;
const POOL_MATCHES_ROW_LABEL = PREVIEW.tournament.sizing.poolMatchesRow;
const THIS_GROUP_ONLY_LABEL = PREVIEW.tournament.sizing.thisGroupOnly;
const UNEVEN_POOLS_COPY = PREVIEW.tournament.sizing.unevenPools;
const WHO_CAN_TAKE_A_SEAT_LABEL = PREVIEW.tournament.sizing.whoCanTakeASeat;
const WITH_A_PARTNER_ONLY_LABEL = PREVIEW.tournament.sizing.withPartnerOnly;

export function TournamentPreviewStates({
  fixtures,
  cardFixtures,
  kingFixtures,
}: {
  cardFixtures: TournamentCardFixtures;
  kingFixtures: ReturnType<typeof createKingTournamentFixtures>;
  fixtures: {
    preDrawWithoutSeat: TournamentFixture;
    preDrawSeatedHalfOpen: TournamentFixture;
    organizerTwoHalfTeams: TournamentFixture;
    organizerDraftedDraw: TournamentFixture;
    organizerPosted: TournamentFixture;
    postedMid: TournamentFixture;
    finished: TournamentFixture;
  };
}) {
  const kingPlayed = kingPlayedSummary(kingFixtures.playerFinished, "en");
  return (
    <div className="space-y-10">
      <section className="space-y-4" data-preview="king-of-the-court">
        <h2 className="text-title font-semibold">King of the court</h2>
        <div className="grid items-start gap-10 lg:grid-cols-2 xl:grid-cols-4">
          <PreviewColumn
            title="Organizer, full, ready to draw"
            data={kingFixtures.organizerReadyToDraw}
          />
          <PreviewColumn
            title="Player, the Courts tab"
            data={kingFixtures.playerCourts}
          />
          <PreviewColumn
            title="Organizer, final order"
            data={kingFixtures.organizerFinalOrder}
          />
          <PreviewColumn
            title="Player, finished"
            data={kingFixtures.playerFinished}
          />
        </div>
        {kingPlayed ? (
          <ul className="max-w-column">
            <KingPlayedCard
              game={{
                id: kingFixtures.playerFinished.id,
                name: kingFixtures.playerFinished.name,
                windowStart: kingFixtures.playerFinished.windowStart,
                displayTime: kingFixtures.playerFinished.createdAt,
                groupName: kingFixtures.playerFinished.groupName,
                venue: {
                  name: kingFixtures.playerFinished.venue?.name ?? "",
                },
                kingOfTheCourt: kingPlayed,
              }}
            />
          </ul>
        ) : null}
      </section>
      <section className="space-y-4">
        <h2 className="text-title font-semibold">Rounds</h2>
        <div className="grid items-start gap-10 lg:grid-cols-2 xl:grid-cols-4">
          <PreviewColumn
            title="Organizer, nothing made"
            data={fixtures.organizerPosted}
            rounds="empty"
          />
          <PreviewColumn
            title="Organizer, every Round drafted"
            data={fixtures.organizerPosted}
            rounds="drafted"
          />
          <PreviewColumn
            title="Organizer, Round 2 on court"
            data={fixtures.organizerPosted}
            rounds="live"
          />
          <PreviewColumn
            title="Player, Round 2 on court"
            data={fixtures.postedMid}
            rounds="live"
          />
          <PreviewColumn
            title="Player, finished"
            data={fixtures.finished}
            rounds="finished"
          />
          <PreviewColumn
            title="Organizer, finished"
            data={{ ...fixtures.finished, isOrganizer: true }}
            rounds="finished"
          />
        </div>
      </section>
      <div className="grid items-start gap-10 lg:grid-cols-2 xl:grid-cols-3">
        <PreviewColumn
          title="Pre-draw, no seat"
          data={fixtures.preDrawWithoutSeat}
        />
        <PreviewColumn
          title="Pre-draw, seated Half team"
          data={fixtures.preDrawSeatedHalfOpen}
        />
        <PreviewColumn
          title="Organizer, two Half teams"
          data={fixtures.organizerTwoHalfTeams}
        />
        <PreviewColumn
          title="Organizer, drafted draw"
          data={fixtures.organizerDraftedDraw}
        />
        <PreviewColumn
          title="Posted, mid-tournament"
          data={fixtures.postedMid}
        />
        <PreviewColumn
          title="Finished, group winner"
          data={fixtures.finished}
          rounds="finished"
        />
      </div>
      <section className="space-y-4">
        <h2 className="text-title font-semibold">Finished share card</h2>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div className="max-w-column w-full" data-preview="share-placing">
            <ShareCardPreview data={fixtures.finished} />
          </div>
          <div className="max-w-column w-full" data-preview="share-table">
            <ShareCardPreview
              data={{ ...fixtures.finished, isOrganizer: true }}
            />
          </div>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-title font-semibold">Games list card</h2>
        <div className="grid items-start gap-10 lg:grid-cols-2 xl:grid-cols-4">
          <CardPreviewColumn title="Open" game={cardFixtures.open} />
          <CardPreviewColumn
            title="In with a half team"
            game={cardFixtures.inWithHalfTeam}
          />
          <CardPreviewColumn title="Full" game={cardFixtures.full} />
          <CardPreviewColumn title="Drawn" game={cardFixtures.drawn} />
          <CardPreviewColumn
            title="Drawn, knockout only"
            game={cardFixtures.drawnKnockoutOnly}
          />
          <CardPreviewColumn
            title="Drawn, groups then knockout"
            game={cardFixtures.drawnGroupsThenKnockout}
          />
          <CardPreviewColumn
            title="Knockout only, Champion"
            game={cardFixtures.knockoutChampion}
          />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-title font-semibold">Your-tournament Match card</h2>
        <div className="grid items-start gap-10 lg:grid-cols-2 xl:grid-cols-4">
          <MatchCardPreviewColumn
            title="Upcoming, no result yet"
            game={cardFixtures.matchUpcoming}
          />
          <MatchCardPreviewColumn
            title="Won R1"
            game={cardFixtures.matchWonRoundOne}
          />
          <MatchCardPreviewColumn
            title="Knockout only, Semi-final"
            game={cardFixtures.knockoutSemiFinal}
          />
          <MatchCardPreviewColumn
            title="Groups then knockout, Quarter-final"
            game={cardFixtures.groupsThenKnockoutQuarterFinal}
          />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-title font-semibold">Home next game</h2>
        <div className="grid items-start gap-10 lg:grid-cols-2 xl:grid-cols-4">
          <HomeMatchCardPreviewColumn
            title="Upcoming"
            game={cardFixtures.matchUpcoming}
            phase="upcoming"
          />
          <HomeMatchCardPreviewColumn
            title="Playing now"
            game={cardFixtures.matchNeedsResults}
            phase="ongoing"
          />
          <HomeMatchCardPreviewColumn
            title="Needs results"
            game={cardFixtures.matchNeedsResults}
            phase="needs_results"
            canAddResults
          />
          <HomeMatchCardPreviewColumn
            title="Knockout only, Semi-final"
            game={cardFixtures.knockoutSemiFinal}
            phase="upcoming"
          />
          <HomeMatchCardPreviewColumn
            title="Groups then knockout, last group round"
            game={cardFixtures.groupsThenKnockoutLastPoolRound}
            phase="upcoming"
          />
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-title font-semibold">Create screen controls</h2>
        <div className="max-w-column mx-auto w-full">
          <TournamentCreateControlsPreview />
        </div>
      </section>
    </div>
  );
}

function PreviewColumn({
  title,
  data,
  rounds = "live",
}: {
  title: string;
  data: TournamentFixture;
  rounds?: RoundsPreviewVariant;
}) {
  return (
    <div className="max-w-column mx-auto flex w-full min-w-0 flex-col gap-4">
      <h2 className="text-title font-semibold">{title}</h2>
      <TournamentHomePreview data={data} rounds={rounds} />
    </div>
  );
}

function ShareCardPreview({ data }: { data: TournamentFixture }) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const card = tournamentShareCard(data, "en");
  if (!card) {
    return null;
  }
  return (
    <ScaledCanvas
      canvasRef={canvasRef}
      canvasWidth={TOURNAMENT_CARD_SIZE}
      canvasHeight={TOURNAMENT_CARD_SIZE}
    >
      <TournamentShareCard card={card} />
    </ScaledCanvas>
  );
}

function CardPreviewColumn({
  title,
  game,
}: {
  title: string;
  game: TournamentCardFixture;
}) {
  return (
    <div className="max-w-column mx-auto flex w-full flex-col gap-4">
      <h3 className="text-muted-foreground text-meta">{title}</h3>
      <ul>
        <TournamentSummaryCard
          game={game}
          href={`/dashboard/design/tournament#${game.id}`}
          onJoinSeat={() => undefined}
          onJoinWaitlist={() => undefined}
        />
      </ul>
    </div>
  );
}

function MatchCardPreviewColumn({
  title,
  game,
}: {
  title: string;
  game: TournamentCardFixture;
}) {
  return (
    <div className="max-w-column mx-auto flex w-full flex-col gap-4">
      <h3 className="text-muted-foreground text-meta">{title}</h3>
      <ul>
        <TournamentMatchCard
          game={game}
          href={`/dashboard/design/tournament#${game.id}`}
        />
      </ul>
    </div>
  );
}

function HomeMatchCardPreviewColumn({
  title,
  game,
  phase,
  canAddResults = false,
}: {
  title: string;
  game: TournamentCardFixture;
  phase: TournamentMatchPhase;
  canAddResults?: boolean;
}) {
  return (
    <div className="max-w-column mx-auto flex w-full flex-col gap-4">
      <h3 className="text-muted-foreground text-meta">{title}</h3>
      <HomeTournamentMatchCard
        game={game}
        href={`/dashboard/design/tournament#${game.id}`}
        phase={phase}
        canAddResults={canAddResults}
      />
    </div>
  );
}

function TournamentHomePreview({
  data,
  rounds,
}: {
  data: TournamentFixture;
  rounds: RoundsPreviewVariant;
}) {
  return (
    <TournamentHome
      data={data}
      roundsPreview={
        data.drawPostedAt
          ? {
              rounds: roundsPreviewData(data, rounds),
              actions: previewRoundsActions,
            }
          : undefined
      }
      sharePending={false}
      joinPending={false}
      leavePending={false}
      kickPending={false}
      closePending={false}
      reopenPending={false}
      mergePending={false}
      mergeError={null}
      drawPending={false}
      drawError={null}
      postPending={false}
      postError={null}
      undoPending={false}
      undoError={null}
      onMerge={() => undefined}
      onDraw={() => undefined}
      onPost={() => undefined}
      onUndo={() => undefined}
      teamId=""
      onTeamIdChange={() => undefined}
      onRegisterTeam={() => undefined}
      registerTeamPending={false}
      onJoin={data.canRegister ? () => undefined : undefined}
      onLeaveGame={data.canLeave ? () => undefined : undefined}
      onInvite={data.isOrganizer ? () => undefined : undefined}
      onShare={data.isOrganizer ? () => undefined : undefined}
      onEdit={data.isOrganizer ? () => undefined : undefined}
      onCloseRegistration={data.isOrganizer ? () => undefined : undefined}
      onReopenRegistration={data.isOrganizer ? () => undefined : undefined}
      onCancelGame={data.isOrganizer ? () => undefined : undefined}
    />
  );
}

function TournamentCreateControlsPreview() {
  const [teamCount, setTeamCount] = useState(12);
  const [poolCount, setPoolCount] = useState(defaultPoolCount(12));
  const [who, setWho] = useState<"group" | "anyone">("group");
  const [join, setJoin] = useState<"alone" | "partner">("alone");

  function onTeamCountChange(nextCount: number) {
    setTeamCount(nextCount);
    const allowed = poolCountOptions(nextCount);
    setPoolCount((current) =>
      allowed.includes(current) ? current : defaultPoolCount(nextCount),
    );
  }

  const sized = sizeFriendlyTournament(teamCount, poolCount);
  const sizing = sized.ok ? sized.sizing : null;
  const poolOptions = poolCountOptions(teamCount);
  const poolMin = poolOptions[0] ?? 1;
  const poolMax = poolOptions[poolOptions.length - 1] ?? poolMin;
  const priceLabel = formatPricePerPlayerFils(12000, "en");
  const start = zonedDateTimeToInstant({
    year: 2026,
    month: 9,
    day: 20,
    hour: 9,
  });
  const finish = zonedDateTimeToInstant({
    year: 2026,
    month: 9,
    day: 20,
    hour: 16,
  });
  const fit = sizing
    ? oneDayFit({
        start,
        finish,
        roundMatches: sizeTournamentRounds(sizing.poolSizes, sizing.roundCount)
          .roundMatches,
        courtCount: 2,
        matchMinutes: null,
      })
    : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <p className="text-muted-foreground text-meta">Bromma</p>
        <h3 className="font-expanded text-display mt-4 leading-none tracking-[-0.03em]">
          {CREATE_TOURNAMENT_HEADING_LEAD}
          <br />
          {CREATE_TOURNAMENT_HEADING_TRAIL}
        </h3>
        <p className="text-muted-foreground text-body mt-2.5 leading-relaxed">
          {CREATE_SUBLINE}
        </p>
      </div>

      <StepperField
        id="preview-team-count"
        label="Game teams"
        value={teamCount}
        unit="Game teams"
        min={TOURNAMENT_TEAM_MIN}
        max={TOURNAMENT_TEAM_MAX}
        step={TOURNAMENT_TEAM_STEP}
        onChange={onTeamCountChange}
        decreaseLabel="Fewer Game teams"
        increaseLabel="More Game teams"
        description={
          <p className="text-muted-foreground text-meta">
            {playersInPairsLine(teamCount, "en")}
          </p>
        }
      />

      <StepperField
        id="preview-pool-count"
        label="Groups"
        value={poolCount}
        unit={poolCount === 1 ? "group" : "groups"}
        min={poolMin}
        max={poolMax}
        step={1}
        onChange={setPoolCount}
        decreaseLabel="Fewer groups"
        increaseLabel="More groups"
        description={
          sizing ? (
            <div className="flex flex-col gap-1">
              <p className="text-muted-foreground text-meta">
                {formatPoolSizeLine(sizing, "en")}
              </p>
              {sizing.uneven ? (
                <p className="text-muted-foreground text-meta">
                  {UNEVEN_POOLS_COPY}
                </p>
              ) : null}
            </div>
          ) : null
        }
      />

      <PreviewSegment
        id="preview-who"
        label={WHO_CAN_TAKE_A_SEAT_LABEL}
        value={who}
        onChange={setWho}
        options={[
          { value: "group", label: THIS_GROUP_ONLY_LABEL },
          { value: "anyone", label: ANYONE_WITH_THE_LINK_LABEL },
        ]}
      />

      <PreviewSegment
        id="preview-join"
        label={HOW_PEOPLE_JOIN_LABEL}
        value={join}
        onChange={setJoin}
        options={[
          { value: "alone", label: ALONE_OR_WITH_A_PARTNER_LABEL },
          { value: "partner", label: WITH_A_PARTNER_ONLY_LABEL },
        ]}
      />

      {sizing ? (
        <TournamentDetailRows
          rows={[
            {
              label: POOL_MATCHES_ROW_LABEL,
              value:
                sizing.poolMatches === 1
                  ? "1 Match"
                  : `${sizing.poolMatches} Matches`,
            },
            {
              label: MATCHES_PER_TEAM_ROW_LABEL,
              value: formatMatchesPerTeam(sizing, "en"),
            },
            {
              label: ROUNDS_ROW_LABEL,
              value:
                sizing.roundCount === 1
                  ? "1 Round"
                  : `${sizing.roundCount} Rounds`,
            },
            {
              label: EACH_MATCH_ROW_LABEL,
              value: `${tournamentMatchMinutes(null)} min`,
            },
            {
              label: COURTS_ROW_LABEL,
              value: courtCountValue(2, "en"),
            },
            {
              label: PRICE_ROW_LABEL,
              value: priceLabel
                ? `${priceLabel} ${PRICE_PER_PLAYER_JOIN_SUFFIX}`
                : "—",
            },
            {
              label: COUNTS_FOR_RATING_LABEL,
              value: COUNTS_FOR_RATING_YES,
            },
            {
              label: DRAW_ROW_LABEL,
              value: DRAW_RANDOM_VALUE,
            },
          ]}
        />
      ) : null}

      {fit ? (
        <div className="border-ink rounded-card border p-5">
          <p className="text-muted-foreground text-meta">
            {ONE_DAY_CALLOUT_LABEL}
          </p>
          {fit.lastFinish ? (
            <p className="text-lead mt-2 leading-snug">
              {lastMatchFinishCopy(formatGameClock(fit.lastFinish, "en"), "en")}
            </p>
          ) : null}
          {fit.overruns ? (
            <p className="text-muted-foreground text-meta mt-2 leading-relaxed">
              {ONE_DAY_OVERRUN_MESSAGE}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-rule flex flex-col gap-2.5 border-t pt-5">
        <div className={cn(buttonVariants({ size: "lg" }), "font-semibold")}>
          {CREATE_PRIMARY_ACTION}
        </div>
        <p className="text-muted-foreground text-eyebrow text-center leading-relaxed">
          {CREATE_FOOTER_COPY}
        </p>
      </div>
    </div>
  );
}

function PreviewSegment<T extends string>({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  const labelId = `${id}-label`;
  return (
    <Field>
      <FieldLabel id={labelId} className={FIELD_LABEL}>
        {label}
      </FieldLabel>
      <Tabs
        value={value}
        onValueChange={(next) => {
          const match = options.find((option) => option.value === next);
          if (match) {
            onChange(match.value);
          }
        }}
      >
        <TabsList variant="segmented" id={id} aria-labelledby={labelId}>
          {options.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </Field>
  );
}

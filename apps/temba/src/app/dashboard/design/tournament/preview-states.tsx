"use client";

import { useState } from "react";

import { StepperField } from "~/components/games/stepper-field";
import { TournamentDetailRows } from "~/components/games/tournament-detail-rows";
import { TournamentHome } from "~/components/games/tournament-home";
import { TAB_SEGMENT } from "~/components/groups/group-home-chrome";
import { Field, FieldLabel } from "~/components/ui/field";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import type { TournamentFixture } from "~/fixtures/tournament";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import {
  COUNTS_FOR_RATING_LABEL,
  COUNTS_FOR_RATING_YES,
  PRICE_ROW_LABEL,
} from "~/lib/tournament-home";
import {
  DRAW_RANDOM_VALUE,
  DRAW_ROW_LABEL,
  PRICE_PER_PLAYER_JOIN_SUFFIX,
  ROUNDS_ROW_LABEL,
} from "~/lib/tournament-join";
import {
  ALONE_OR_WITH_A_PARTNER_LABEL,
  ANYONE_WITH_THE_LINK_LABEL,
  COURTS_ROW_LABEL,
  CREATE_FOOTER_COPY,
  CREATE_PRIMARY_ACTION,
  CREATE_SUBLINE,
  CREATE_TOURNAMENT_HEADING_LEAD,
  CREATE_TOURNAMENT_HEADING_TRAIL,
  courtCountValue,
  defaultPoolCount,
  EACH_MATCH_ROW_LABEL,
  formatMatchesPerTeam,
  formatPoolSizeLine,
  HOW_PEOPLE_JOIN_LABEL,
  lastMatchFinishCopy,
  MATCHES_PER_TEAM_ROW_LABEL,
  ONE_DAY_CALLOUT_LABEL,
  ONE_DAY_OVERRUN_MESSAGE,
  oneDayFit,
  playersInPairsLine,
  POOL_MATCHES_ROW_LABEL,
  poolCountOptions,
  sizeFriendlyTournament,
  THIS_GROUP_ONLY_LABEL,
  tournamentMatchMinutes,
  TOURNAMENT_TEAM_MAX,
  TOURNAMENT_TEAM_MIN,
  TOURNAMENT_TEAM_STEP,
  UNEVEN_POOLS_COPY,
  WHO_CAN_TAKE_A_SEAT_LABEL,
  WITH_A_PARTNER_ONLY_LABEL,
} from "~/lib/tournament-sizing";
import { cn } from "~/lib/utils";

const FIELD_LABEL = "text-muted-foreground text-[13px] font-normal";

export function TournamentPreviewStates({
  fixtures,
}: {
  fixtures: {
    preDrawWithoutSeat: TournamentFixture;
    preDrawSeatedHalfOpen: TournamentFixture;
    organizerTwoHalfTeams: TournamentFixture;
    organizerDraftedDraw: TournamentFixture;
    postedMid: TournamentFixture;
    finished: TournamentFixture;
  };
}) {
  return (
    <div className="space-y-10">
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
        <PreviewColumn title="Finished, group winner" data={fixtures.finished} />
      </div>
      <section className="space-y-4">
        <h2 className="text-title font-semibold">Create screen controls</h2>
        <div className="mx-auto w-full max-w-[420px]">
          <TournamentCreateControlsPreview />
        </div>
      </section>
    </div>
  );
}

function PreviewColumn({
  title,
  data,
}: {
  title: string;
  data: TournamentFixture;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[420px] flex-col gap-4">
      <h2 className="text-title font-semibold">{title}</h2>
      <TournamentHomePreview data={data} />
    </div>
  );
}

function TournamentHomePreview({ data }: { data: TournamentFixture }) {
  return (
    <TournamentHome
      data={data}
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
  const priceLabel = formatPricePerPlayerCents(1200);
  const start = new Date(2026, 8, 20, 9, 0, 0);
  const finish = new Date(2026, 8, 20, 16, 0, 0);
  const fit = sizing
    ? oneDayFit({
        start,
        finish,
        poolMatches: sizing.poolMatches,
        courtCount: 2,
        matchMinutes: null,
      })
    : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div>
        <p className="text-muted-foreground text-[13px]">Bromma</p>
        <h3 className="font-expanded mt-4 text-[38px] leading-none tracking-[-0.03em]">
          {CREATE_TOURNAMENT_HEADING_LEAD}
          <br />
          {CREATE_TOURNAMENT_HEADING_TRAIL}
        </h3>
        <p className="text-muted-foreground mt-2.5 text-[15px] leading-relaxed">
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
          <p className="text-muted-foreground text-[13px]">
            {playersInPairsLine(teamCount)}
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
              <p className="text-muted-foreground text-[13px]">
                {formatPoolSizeLine(sizing)}
              </p>
              {sizing.uneven ? (
                <p className="text-muted-foreground text-[13px]">
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
              value: formatMatchesPerTeam(sizing),
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
              value: courtCountValue(2),
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
        <div className="border-ink rounded-[14px] border p-5">
          <p className="text-muted-foreground text-[13px]">
            {ONE_DAY_CALLOUT_LABEL}
          </p>
          {fit.lastFinish ? (
            <p className="mt-2 text-[17px] leading-snug">
              {lastMatchFinishCopy(
                fit.lastFinish.toLocaleTimeString(undefined, {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              )}
            </p>
          ) : null}
          {fit.overruns ? (
            <p className="text-muted-foreground mt-2 text-[13px] leading-relaxed">
              {ONE_DAY_OVERRUN_MESSAGE}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="border-rule flex flex-col gap-2.5 border-t pt-5">
        <div className="bg-ink text-paper flex h-[52px] min-h-[52px] items-center justify-center rounded-[12px] text-base font-semibold">
          {CREATE_PRIMARY_ACTION}
        </div>
        <p className="text-muted-foreground text-center text-[12px] leading-relaxed">
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
        <TabsList
          id={id}
          aria-labelledby={labelId}
          className="border-rule bg-paper w-full max-w-full justify-stretch overflow-hidden rounded-[12px] border p-0 group-data-[orientation=horizontal]/tabs:h-auto"
        >
          {options.map((option) => (
            <TabsTrigger
              key={option.value}
              value={option.value}
              className={cn(TAB_SEGMENT, "px-2 text-[14px]")}
            >
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </Field>
  );
}

import {
  KNOCKOUT_BYE_LABEL,
  KNOCKOUT_CHAMPION_TAG,
  KNOCKOUT_DECIDING_SET_COPY,
  KNOCKOUT_WON_TAG,
  knockoutPlaceMetaLine,
  knockoutRoundDayLine,
  knockoutSideLabel,
  type KnockoutViewPlace,
  type KnockoutViewRound,
  type KnockoutViewSide,
} from "~/lib/tournament-knockout-view";
import { YOUR_TEAM_TAG } from "~/lib/tournament-home";
import { cn } from "~/lib/utils";

function KnockoutSideRow({
  side,
  resultTag = null,
}: {
  side: KnockoutViewSide;
  resultTag?: string | null;
}) {
  const isTeam = side.kind === "team";
  const isViewer = side.kind === "team" && side.team.isViewer;
  return (
    <div className="flex min-h-11 items-center gap-2 py-2">
      <span
        className={cn(
          "text-body min-w-0 flex-1 truncate",
          isTeam ? "text-foreground" : "text-muted-foreground",
          isViewer && "font-semibold",
        )}
      >
        {knockoutSideLabel(side)}
      </span>
      {isViewer ? (
        <span className="text-muted-foreground text-meta shrink-0">
          {YOUR_TEAM_TAG}
        </span>
      ) : null}
      {resultTag ? (
        <span className="text-success text-meta shrink-0 font-semibold">
          {resultTag}
        </span>
      ) : null}
    </div>
  );
}

function KnockoutPlaceCard({
  place,
  isFinal,
}: {
  place: KnockoutViewPlace;
  isFinal: boolean;
}) {
  const meta =
    place.kind === "match"
      ? knockoutPlaceMetaLine(place.startTime, place.courtName)
      : null;
  const winnerTag = isFinal ? KNOCKOUT_CHAMPION_TAG : KNOCKOUT_WON_TAG;
  return (
    <div className="border-rule rounded-card border px-4 pt-3">
      <div className="flex items-baseline justify-between gap-2.5">
        <span className="text-eyebrow font-semibold uppercase tracking-[0.06em]">
          {place.code}
        </span>
        {meta ? (
          <span className="text-muted-foreground text-meta">{meta}</span>
        ) : null}
      </div>
      <div className="divide-rule divide-y">
        {place.kind === "match" ? (
          <>
            <KnockoutSideRow
              side={place.slot1}
              resultTag={place.winner === 1 ? winnerTag : null}
            />
            <KnockoutSideRow
              side={place.slot2}
              resultTag={place.winner === 2 ? winnerTag : null}
            />
            {place.needsDecidingSet ? (
              <p className="text-muted-foreground text-meta py-2">
                {KNOCKOUT_DECIDING_SET_COPY}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <KnockoutSideRow side={place.side} />
            <div className="text-muted-foreground text-body flex min-h-11 items-center py-2">
              {KNOCKOUT_BYE_LABEL}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function TournamentKnockoutRound({
  round,
  headingLevel = "h3",
  isFinal = false,
}: {
  round: KnockoutViewRound;
  headingLevel?: "h2" | "h3";
  isFinal?: boolean;
}) {
  const Heading = headingLevel;
  const day = knockoutRoundDayLine(round);
  return (
    <section aria-label={round.name}>
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <Heading className="font-expanded text-title tracking-[-0.03em]">
          {round.name}
        </Heading>
        {day ? <p className="text-muted-foreground text-meta">{day}</p> : null}
      </div>
      <ul className="flex flex-col gap-2.5">
        {round.places.map((place) => (
          <li key={`${place.kind}-${place.position}`}>
            <KnockoutPlaceCard place={place} isFinal={isFinal} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TournamentKnockoutTree({
  rounds,
  headingLevel = "h2",
}: {
  rounds: readonly KnockoutViewRound[];
  headingLevel?: "h2" | "h3";
}) {
  return (
    <div className="flex flex-col gap-[26px]">
      {rounds.map((round, index) => (
        <TournamentKnockoutRound
          key={round.round}
          round={round}
          headingLevel={headingLevel}
          isFinal={index === rounds.length - 1}
        />
      ))}
    </div>
  );
}

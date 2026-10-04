import { Button } from "~/components/ui/button";
import { CANCEL_MATCH_ACTION } from "@repo/domain/game-copy";
import {
  KNOCKOUT_BYE_LABEL,
  KNOCKOUT_DECIDING_SET_COPY,
  KNOCKOUT_WALKOVER_TAG,
  canCancelKnockoutPlace,
  knockoutPlaceMetaLine,
  knockoutRoundDayLine,
  knockoutSideLabel,
  type KnockoutMatchPlace,
  type KnockoutViewPlace,
  type KnockoutViewRound,
  type KnockoutViewSide,
} from "@repo/domain/tournament-knockout-view";
import { knockoutPlaceSideTags } from "@repo/domain/tournament-details";
import { YOUR_TEAM_TAG } from "@repo/domain/tournament-home";
import { cn } from "~/lib/utils";

function KnockoutSideRow({
  side,
  resultTag = null,
  walkover = false,
}: {
  side: KnockoutViewSide;
  resultTag?: string | null;
  walkover?: boolean;
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
      {walkover ? (
        <span className="text-muted-foreground text-meta shrink-0 font-semibold">
          {KNOCKOUT_WALKOVER_TAG}
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
  onCancelMatch,
}: {
  place: KnockoutViewPlace;
  isFinal: boolean;
  onCancelMatch?: (place: KnockoutMatchPlace) => void;
}) {
  const meta =
    place.kind === "match"
      ? knockoutPlaceMetaLine(place.startTime, place.courtName)
      : null;
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
              {...knockoutPlaceSideTags(place, 1, isFinal)}
            />
            <KnockoutSideRow
              side={place.slot2}
              {...knockoutPlaceSideTags(place, 2, isFinal)}
            />
            {place.scoreLabel ? (
              <p className="text-muted-foreground text-meta py-2 tabular-nums">
                {place.scoreLabel}
              </p>
            ) : null}
            {place.needsDecidingSet ? (
              <p className="text-muted-foreground text-meta py-2">
                {KNOCKOUT_DECIDING_SET_COPY}
              </p>
            ) : null}
            {onCancelMatch && canCancelKnockoutPlace(place) ? (
              <div className="py-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 w-full"
                  onClick={() => onCancelMatch(place)}
                >
                  {CANCEL_MATCH_ACTION}
                </Button>
              </div>
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
  onCancelMatch,
}: {
  round: KnockoutViewRound;
  headingLevel?: "h2" | "h3";
  isFinal?: boolean;
  onCancelMatch?: (place: KnockoutMatchPlace) => void;
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
            <KnockoutPlaceCard
              place={place}
              isFinal={isFinal}
              onCancelMatch={onCancelMatch}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TournamentKnockoutTree({
  rounds,
  headingLevel = "h2",
  onCancelMatch,
}: {
  rounds: readonly KnockoutViewRound[];
  headingLevel?: "h2" | "h3";
  onCancelMatch?: (place: KnockoutMatchPlace) => void;
}) {
  return (
    <div className="flex flex-col gap-[26px]">
      {rounds.map((round, index) => (
        <TournamentKnockoutRound
          key={round.round}
          round={round}
          headingLevel={headingLevel}
          isFinal={index === rounds.length - 1}
          onCancelMatch={onCancelMatch}
        />
      ))}
    </div>
  );
}

"use client";

import { Users } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { GameSeatGrid } from "~/components/games/game-seat-grid";
import {
  formatGameSideLabel,
  gameTeamDisplayName,
} from "~/components/games/game-side-label";
import { LookupUserSelect } from "~/components/invites/lookup-user-select";
import type { LookupUserSearchRow } from "~/server/invites/search-lookup-users";
import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  fieldErrorMessage,
  globalFormErrorMessage,
} from "~/lib/form-mutation-error";
import { type RouterOutputs } from "~/trpc/react";

type GameDetail = RouterOutputs["games"]["byId"];

export function GamePlayersPanel({
  game,
  partnerQuery,
  selectedPartner,
  partnerSide,
  partnerPosition,
  teamId,
  partnerSearch,
  partnerSearchPending,
  registerWithPartnerPending,
  partnerError,
  registerSeatPending,
  moveSeatPending,
  kickPending,
  registerTeamPending,
  onPartnerQueryChange,
  onSelectedPartnerChange,
  onPartnerSideChange,
  onPartnerPositionChange,
  onTeamIdChange,
  onRegisterSeat,
  onMoveSeat,
  onKick,
  onKickWaitlist,
  onRegisterWithPartner,
  onRegisterTeam,
}: {
  game: GameDetail;
  partnerQuery: string;
  selectedPartner: LookupUserSearchRow[];
  partnerSide: string;
  partnerPosition: "left" | "right";
  teamId: string;
  partnerSearch: LookupUserSearchRow[] | undefined;
  partnerSearchPending: boolean;
  registerWithPartnerPending: boolean;
  partnerError: {
    message: string;
    data?: { zodError?: unknown } | null;
  } | null;
  registerSeatPending: boolean;
  moveSeatPending: boolean;
  kickPending: boolean;
  registerTeamPending: boolean;
  onPartnerQueryChange: (query: string) => void;
  onSelectedPartnerChange: (selected: LookupUserSearchRow[]) => void;
  onPartnerSideChange: (side: string) => void;
  onPartnerPositionChange: (position: "left" | "right") => void;
  onTeamIdChange: (teamId: string) => void;
  onRegisterSeat: (input?: {
    sideIndex?: number;
    position?: "left" | "right";
  }) => void;
  onMoveSeat: (sideIndex: number, position: "left" | "right") => void;
  onKick: (userId: string) => void;
  onKickWaitlist: (waitlistId: string) => void;
  onRegisterWithPartner: (input: {
    partnerUserId: string;
    sideIndex?: number;
    position?: "left" | "right";
  }) => void;
  onRegisterTeam: (teamId: string) => void;
}) {
  const individualSeats =
    game.registrationMode === "individual" && game.format !== "americano";
  const nobodySeated =
    individualSeats &&
    game.sides.every((side) => side.left == null && side.right == null) &&
    game.unseatedPlayers.length === 0;
  const registeredWithoutTeams =
    game.gameTeams.length === 0 && game.registeredPlayers.length === 0;

  return (
    <div className="space-y-8">
      <Section
        title={
          game.format === "americano"
            ? "Player pool"
            : game.registrationMode === "individual"
              ? "Sides"
              : "Registered"
        }
      >
        {individualSeats ? (
          <div className="space-y-4">
            <GameSeatGrid
              sides={game.sides}
              canJoinVacant={
                game.canRegister || game.canWaitlist || game.canPickSeat
              }
              joinLabel={
                game.canWaitlist && !game.canPickSeat ? "Join waitlist" : "Join"
              }
              joining={registerSeatPending}
              canMove={game.canMove}
              moving={moveSeatPending}
              isOrganizer={game.isOrganizer}
              cancelled={Boolean(game.cancelledAt)}
              kickPending={kickPending}
              onJoin={(sideIndex, position) =>
                onRegisterSeat({ sideIndex, position })
              }
              onMove={onMoveSeat}
              onKick={onKick}
              sideNoun={game.format === "friendly_tournament" ? "Side" : "Team"}
            />
            {game.canPickSeat ? (
              <p className="text-muted-foreground text-sm">
                Pick a vacant Position to occupy a side.
              </p>
            ) : null}
            {nobodySeated ? (
              <p className="text-muted-foreground text-sm">
                Nobody is seated yet. Pick a vacant Position.
              </p>
            ) : null}
            {game.unseatedPlayers.length > 0 ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  These Users must pick a vacant Position before they occupy a
                  side.
                </p>
                <RowList>
                  {game.unseatedPlayers.map((player) => (
                    <ListRow
                      key={player.id}
                      leading={<UserAvatar name={player.name} size="lg" />}
                      title={player.name}
                      trailing={
                        game.isOrganizer && !game.cancelledAt ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onKick(player.id)}
                            disabled={kickPending}
                          >
                            Kick
                          </Button>
                        ) : undefined
                      }
                    />
                  ))}
                </RowList>
              </div>
            ) : null}
          </div>
        ) : registeredWithoutTeams ? (
          <EmptyState
            icon={Users}
            title="Nobody is registered yet"
            description="Players who join this Game will show up here."
            className="py-8"
          />
        ) : (
          <RowList>
            {game.gameTeams.map((side) => {
              const firstMember = side.members[0];
              const title = gameTeamDisplayName(side);
              return (
                <ListRow
                  key={side.id}
                  leading={
                    <UserAvatar name={firstMember?.name ?? title} size="lg" />
                  }
                  title={title}
                  trailing={
                    game.isOrganizer && !game.cancelledAt && firstMember ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onKick(firstMember.id)}
                        disabled={kickPending}
                      >
                        Kick
                      </Button>
                    ) : undefined
                  }
                />
              );
            })}
            {game.registeredPlayers
              .filter(
                (player) =>
                  !game.gameTeams.some((side) =>
                    side.members.some((member) => member.id === player.id),
                  ),
              )
              .map((player) => (
                <ListRow
                  key={player.id}
                  leading={<UserAvatar name={player.name} size="lg" />}
                  title={player.name}
                  trailing={
                    game.isOrganizer && !game.cancelledAt ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onKick(player.id)}
                        disabled={kickPending}
                      >
                        Kick
                      </Button>
                    ) : undefined
                  }
                />
              ))}
          </RowList>
        )}
      </Section>

      <Section title="Waitlist">
        {game.waitlist.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Waitlist is empty"
            description="When the Game is full, people can join the waitlist here."
            className="py-8"
          />
        ) : (
          <RowList aria-label="Waitlist">
            {game.waitlist.map((entry, index) => (
              <ListRow
                key={entry.id}
                leading={<UserAvatar name={entry.name} size="lg" />}
                title={`${index + 1}. ${entry.name}`}
                trailing={
                  game.isOrganizer && !game.cancelledAt ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onKickWaitlist(entry.id)}
                      disabled={kickPending}
                    >
                      Kick
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </RowList>
        )}
      </Section>

      {game.canWaitlist && individualSeats ? (
        <Card variant="outlined" className="space-y-3">
          <h3 className="text-title font-medium">Join the waitlist</h3>
          <p className="text-muted-foreground text-sm">
            The Game is full. Join the waitlist alone. You promote into a
            vacated Position.
          </p>
          <Button
            onClick={() => onRegisterSeat()}
            disabled={registerSeatPending}
          >
            {registerSeatPending ? "Joining…" : "Join waitlist"}
          </Button>
        </Card>
      ) : null}

      {(game.canRegister || game.canWaitlist) && individualSeats ? (
        <PartnerRegisterCard
          game={game}
          partnerQuery={partnerQuery}
          selectedPartner={selectedPartner}
          partnerSide={partnerSide}
          partnerPosition={partnerPosition}
          partnerSearch={partnerSearch}
          partnerSearchPending={partnerSearchPending}
          registerWithPartnerPending={registerWithPartnerPending}
          partnerError={partnerError}
          onPartnerQueryChange={onPartnerQueryChange}
          onSelectedPartnerChange={onSelectedPartnerChange}
          onPartnerSideChange={onPartnerSideChange}
          onPartnerPositionChange={onPartnerPositionChange}
          onRegisterWithPartner={onRegisterWithPartner}
        />
      ) : null}

      {(game.canRegister || game.canWaitlist) &&
      game.registrationMode === "team_only" ? (
        <Card variant="outlined">
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (teamId.length === 0) {
                toast.error("Pick a complete Team");
                return;
              }
              onRegisterTeam(teamId);
            }}
          >
            <h3 className="text-title font-medium">Register a Team</h3>
            {game.eligibleTeams.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                You need a complete Team whose both partners are allowed on this
                Game.
              </p>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="team-id">Team</FieldLabel>
                  <Select value={teamId} onValueChange={onTeamIdChange}>
                    <SelectTrigger id="team-id">
                      <SelectValue placeholder="Select a Team" />
                    </SelectTrigger>
                    <SelectContent>
                      {game.eligibleTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.memberNames.join(" / ")})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button type="submit" disabled={registerTeamPending}>
                  {registerTeamPending ? "Registering…" : "Register Team"}
                </Button>
              </>
            )}
          </form>
        </Card>
      ) : null}
    </div>
  );
}

function PartnerRegisterCard({
  game,
  partnerQuery,
  selectedPartner,
  partnerSide,
  partnerPosition,
  partnerSearch,
  partnerSearchPending,
  registerWithPartnerPending,
  partnerError,
  onPartnerQueryChange,
  onSelectedPartnerChange,
  onPartnerSideChange,
  onPartnerPositionChange,
  onRegisterWithPartner,
}: {
  game: GameDetail;
  partnerQuery: string;
  selectedPartner: LookupUserSearchRow[];
  partnerSide: string;
  partnerPosition: "left" | "right";
  partnerSearch: LookupUserSearchRow[] | undefined;
  partnerSearchPending: boolean;
  registerWithPartnerPending: boolean;
  partnerError: {
    message: string;
    data?: { zodError?: unknown } | null;
  } | null;
  onPartnerQueryChange: (query: string) => void;
  onSelectedPartnerChange: (selected: LookupUserSearchRow[]) => void;
  onPartnerSideChange: (side: string) => void;
  onPartnerPositionChange: (position: "left" | "right") => void;
  onRegisterWithPartner: (input: {
    partnerUserId: string;
    sideIndex?: number;
    position?: "left" | "right";
  }) => void;
}) {
  const vacantSides = game.sides.filter(
    (side) => side.left == null && side.right == null,
  );

  return (
    <Card variant="outlined">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (registerWithPartnerPending) {
            return;
          }
          if (game.canWaitlist) {
            const partnerUserId = selectedPartner[0]?.id;
            if (!partnerUserId) {
              return;
            }
            onRegisterWithPartner({ partnerUserId });
            return;
          }
          if (vacantSides.length === 0) {
            toast.error("No fully vacant side; pick a seat");
            return;
          }
          const sideIndex = Number(partnerSide);
          if (!Number.isInteger(sideIndex) || sideIndex < 1) {
            toast.error("Pick a vacant side and your Position");
            return;
          }
          const partnerUserId = selectedPartner[0]?.id;
          if (!partnerUserId) {
            return;
          }
          onRegisterWithPartner({
            partnerUserId,
            sideIndex,
            position: partnerPosition,
          });
        }}
      >
        <h3 className="text-title font-medium">
          {game.canWaitlist
            ? "Join waitlist with a partner"
            : "Register with a partner"}
        </h3>
        <p className="text-muted-foreground text-sm">
          {game.canWaitlist
            ? "The Game is full. You both join the waitlist as separate rows and each promote alone."
            : game.sides.every(
                  (side) => side.left != null || side.right != null,
                )
              ? "No fully vacant side. Pick a vacant Position instead."
              : "Take one fully vacant side. You pick left or right; your partner gets the other."}
        </p>
        <FormErrorSummary message={globalFormErrorMessage(partnerError)} />
        <FieldGroup>
          {game.canWaitlist ? null : (
            <>
              <Field>
                <FieldLabel htmlFor="partner-side">Side</FieldLabel>
                <Select value={partnerSide} onValueChange={onPartnerSideChange}>
                  <SelectTrigger id="partner-side">
                    <SelectValue placeholder="Vacant side" />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantSides.map((side) => (
                      <SelectItem
                        key={side.sideIndex}
                        value={String(side.sideIndex)}
                      >
                        {formatGameSideLabel(game.format, side.sideIndex)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Refused if that side already has anyone.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="partner-position">
                  Your Position
                </FieldLabel>
                <Select
                  value={partnerPosition}
                  onValueChange={(value) =>
                    onPartnerPositionChange(value as "left" | "right")
                  }
                >
                  <SelectTrigger id="partner-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          <Field>
            <FieldLabel htmlFor="partner-query">Partner</FieldLabel>
            <LookupUserSelect
              id="partner-query"
              query={partnerQuery}
              onQueryChange={onPartnerQueryChange}
              options={partnerSearch}
              selected={selectedPartner}
              onSelectedChange={onSelectedPartnerChange}
              selection="single"
              pending={partnerSearchPending}
              disabled={registerWithPartnerPending}
              error={Boolean(fieldErrorMessage(partnerError, "partnerUserId"))}
              describedBy={
                fieldErrorMessage(partnerError, "partnerUserId")
                  ? "partner-query-error"
                  : undefined
              }
            />
            <FieldDescription>
              Pick an existing User. You both register or waitlist immediately.
            </FieldDescription>
            <FieldError id="partner-query-error">
              {fieldErrorMessage(partnerError, "partnerUserId")}
            </FieldError>
          </Field>
        </FieldGroup>
        <Button
          type="submit"
          disabled={
            registerWithPartnerPending ||
            selectedPartner.length === 0 ||
            (game.canRegister &&
              game.sides.every(
                (side) => side.left != null || side.right != null,
              ))
          }
        >
          {registerWithPartnerPending
            ? "Registering…"
            : game.canWaitlist
              ? "Join waitlist"
              : "Register"}
        </Button>
      </form>
    </Card>
  );
}

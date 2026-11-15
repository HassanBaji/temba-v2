"use client";

import { Users } from "lucide-react";
import { toast } from "sonner";

import { EmptyState } from "~/components/common/empty-state";
import { ListRow, RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { FriendlyGameSeatBlocks } from "~/components/games/friendly-game-seat-blocks";
import { GameSeatGrid } from "~/components/games/game-seat-grid";
import { gamePlayersLink } from "~/lib/game-player-links";
import {
  formatGameSideLabel,
  gameTeamDisplayName,
} from "@repo/domain/game-side-label";
import { LookupUserSelect } from "~/components/invites/lookup-user-select";
import type { LookupUserSearchRow } from "@repo/api/types";
import { Section } from "~/components/layout/section";
import { useLocale, useMessages } from "~/components/locale-provider";
import { GuestTag, NotOnTembaTag } from "~/components/temba/seat";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  Field,
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
import {
  friendlyGameCanKickPlayer,
  friendlyGamePlayersCancelledNote,
} from "@repo/domain/friendly-game-players";
import { showsFriendlyRoster } from "@repo/domain/game-summary-cta";
import { type RouterOutputs } from "~/trpc/react";

type GameDetail = RouterOutputs["games"]["byId"];
type RosterPlayer = GameDetail["registeredPlayers"][number];
type RenameTarget = { userId: string; name: string };

function RosterPlayerRow({
  player,
  isViewer = false,
  canKick,
  kickPending,
  onKick,
  onRename,
}: {
  player: RosterPlayer;
  isViewer?: boolean;
  canKick: boolean;
  kickPending: boolean;
  onKick: (userId: string) => void;
  onRename?: (player: RenameTarget) => void;
}) {
  const m = useMessages();
  const canRename = onRename != null && player.canRename;
  return (
    <ListRow
      leading={
        <UserAvatar
          name={player.name}
          image={player.image}
          size="lg"
          guest={player.guest}
        />
      }
      title={
        <>
          {player.name}
          {isViewer ? (
            <Badge variant="outline" className="ms-2 align-middle">
              {m.common.you}
            </Badge>
          ) : null}
          {player.unclaimed ? (
            <span className="ms-2 inline-flex align-middle">
              <NotOnTembaTag />
            </span>
          ) : null}
          {player.guest ? (
            <span className="ms-2 inline-flex align-middle">
              <GuestTag />
            </span>
          ) : null}
        </>
      }
      subtitle={
        player.phoneMasked ? (
          <span className="tabular-nums">{player.phoneMasked}</span>
        ) : undefined
      }
      trailing={
        canKick || canRename ? (
          <div className="flex items-center gap-2">
            {canRename ? (
              <Button
                variant="outline"
                size="sm"
                aria-label={m.webGame.lineup.renameFor(
                  m.group.addPlayer.renameAction,
                  player.name,
                )}
                onClick={() =>
                  onRename?.({ userId: player.id, name: player.name })
                }
              >
                {m.group.addPlayer.renameAction}
              </Button>
            ) : null}
            {canKick ? (
              <Button
                variant="outline"
                size="sm"
                aria-label={m.webGame.lineup.kickName(player.name)}
                onClick={() => onKick(player.id)}
                disabled={kickPending}
              >
                {m.game.action.kick}
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    />
  );
}

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
  onRenameUnclaimed,
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
  onRenameUnclaimed?: (player: RenameTarget) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const individualSeats =
    game.registrationMode === "individual" && game.format !== "americano";
  const friendlyRoster = showsFriendlyRoster(
    game.format,
    game.registrationMode,
  );
  const cancelled = Boolean(game.cancelledAt);
  const cancelledNote = friendlyRoster
    ? friendlyGamePlayersCancelledNote(cancelled, locale)
    : null;
  const registeredWithoutTeams =
    game.gameTeams.length === 0 && game.registeredPlayers.length === 0;

  return (
    <div className="space-y-8">
      <div>
        {friendlyRoster ? (
          <div className="space-y-4">
            {cancelledNote ? (
              <p className="text-body text-muted-foreground">{cancelledNote}</p>
            ) : game.canPickSeat ? (
              <p className="text-body text-muted-foreground">
                {m.webGame.players.pickVacantPosition}
              </p>
            ) : null}
            <FriendlyGameSeatBlocks
              sides={game.sides}
              viewerUserId={game.viewerUserId}
              cancelled={cancelled}
              canMove={game.canMove}
              canRegister={game.canRegister}
              canPickSeat={game.canPickSeat}
              canWaitlist={game.canWaitlist}
              isOrganizer={game.isOrganizer}
              joining={registerSeatPending}
              moving={moveSeatPending}
              kickPending={kickPending}
              onJoin={(sideIndex, position) =>
                onRegisterSeat({ sideIndex, position })
              }
              onMove={onMoveSeat}
              onKick={onKick}
              linkToPlayers={gamePlayersLink(game)}
            />
            {game.unseatedPlayers.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-body text-muted-foreground font-semibold">
                  {m.webGame.players.notSeatedYet}
                </h2>
                <RowList>
                  {game.unseatedPlayers.map((player) => {
                    const isViewer = player.id === game.viewerUserId;
                    const canKick = friendlyGameCanKickPlayer({
                      isOrganizer: game.isOrganizer,
                      cancelled,
                      isViewer,
                    });
                    return (
                      <RosterPlayerRow
                        key={player.id}
                        player={player}
                        isViewer={isViewer}
                        canKick={canKick}
                        kickPending={kickPending}
                        onKick={onKick}
                        onRename={onRenameUnclaimed}
                      />
                    );
                  })}
                </RowList>
              </div>
            ) : null}
          </div>
        ) : individualSeats ? (
          <div className="space-y-4">
            <GameSeatGrid
              sides={game.sides}
              canJoinVacant={
                game.canRegister || game.canWaitlist || game.canPickSeat
              }
              joinLabel={
                game.canWaitlist && !game.canPickSeat
                  ? m.game.cta.joinWaitlist
                  : m.game.cta.join
              }
              joining={registerSeatPending}
              canMove={game.canMove}
              moving={moveSeatPending}
              isOrganizer={game.isOrganizer}
              cancelled={cancelled}
              kickPending={kickPending}
              onJoin={(sideIndex, position) =>
                onRegisterSeat({ sideIndex, position })
              }
              onMove={onMoveSeat}
              onKick={onKick}
              sideNoun="Team"
            />
            {game.unseatedPlayers.length > 0 ? (
              <div className="space-y-2">
                <h2 className="text-body text-muted-foreground font-semibold">
                  {m.webGame.players.notSeatedYet}
                </h2>
                <RowList>
                  {game.unseatedPlayers.map((player) => (
                    <RosterPlayerRow
                      key={player.id}
                      player={player}
                      canKick={game.isOrganizer && !cancelled}
                      kickPending={kickPending}
                      onKick={onKick}
                      onRename={onRenameUnclaimed}
                    />
                  ))}
                </RowList>
              </div>
            ) : null}
          </div>
        ) : registeredWithoutTeams ? (
          <EmptyState
            icon={Users}
            title={m.webGame.players.nobodyRegistered}
            className="py-8"
          />
        ) : (
          <RowList>
            {game.gameTeams.map((side) => {
              const firstMember = side.members[0];
              const title = gameTeamDisplayName(side, locale);
              return (
                <ListRow
                  key={side.id}
                  leading={
                    <UserAvatar
                      name={firstMember?.name ?? title}
                      image={firstMember?.image}
                      size="lg"
                    />
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
                        {m.game.action.kick}
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
                <RosterPlayerRow
                  key={player.id}
                  player={player}
                  canKick={game.isOrganizer && !cancelled}
                  kickPending={kickPending}
                  onKick={onKick}
                  onRename={onRenameUnclaimed}
                />
              ))}
          </RowList>
        )}
      </div>

      <Section title={m.webGame.players.waitlist}>
        {game.waitlist.length === 0 ? (
          <EmptyState
            headingLevel={3}
            icon={Users}
            title={m.webGame.players.waitlistEmpty}
            className="py-8"
          />
        ) : (
          <RowList aria-label={m.webGame.players.waitlist}>
            {game.waitlist.map((entry, index) => (
              <ListRow
                key={entry.id}
                leading={
                  <UserAvatar name={entry.name} image={entry.image} size="lg" />
                }
                title={m.webGame.players.waitlistEntry(index + 1, entry.name)}
                trailing={
                  game.isOrganizer && !game.cancelledAt ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onKickWaitlist(entry.id)}
                      disabled={kickPending}
                    >
                      {m.game.action.kick}
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
          <h3 className="text-title font-medium">
            {m.webGame.players.joinTheWaitlist}
          </h3>
          <p className="text-muted-foreground text-body">
            {m.webGame.players.gameFullPromote}
          </p>
          <Button
            onClick={() => onRegisterSeat()}
            disabled={registerSeatPending}
          >
            {registerSeatPending ? m.game.cta.joining : m.game.cta.joinWaitlist}
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
                toast.error(m.webGame.players.pickCompleteTeam);
                return;
              }
              onRegisterTeam(teamId);
            }}
          >
            <h3 className="text-title font-medium">
              {m.webGame.players.registerATeam}
            </h3>
            {game.eligibleTeams.length === 0 ? (
              <p className="text-muted-foreground text-body">
                {m.webGame.players.needCompleteTeam}
              </p>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="team-id">
                    {m.webGame.players.team}
                  </FieldLabel>
                  <Select value={teamId} onValueChange={onTeamIdChange}>
                    <SelectTrigger id="team-id">
                      <SelectValue
                        placeholder={m.webGame.players.selectATeam}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {game.eligibleTeams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {m.webGame.players.teamOption(
                            team.name,
                            team.memberNames.join(" / "),
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Button type="submit" disabled={registerTeamPending}>
                  {registerTeamPending
                    ? m.webGame.registering
                    : m.game.action.registerTeam}
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
  const locale = useLocale();
  const m = useMessages();
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
            toast.error(m.webGame.players.noVacantSidePickSeat);
            return;
          }
          const sideIndex = Number(partnerSide);
          if (!Number.isInteger(sideIndex) || sideIndex < 1) {
            toast.error(m.webGame.players.pickVacantSideAndPosition);
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
            ? m.webGame.players.joinWaitlistWithPartner
            : m.webGame.players.registerWithPartner}
        </h3>
        <p className="text-muted-foreground text-body">
          {game.canWaitlist
            ? m.webGame.players.waitlistWithPartnerCopy
            : game.sides.every(
                  (side) => side.left != null || side.right != null,
                )
              ? m.webGame.players.noVacantSideCopy
              : m.webGame.players.takeVacantSideCopy}
        </p>
        <FormErrorSummary message={globalFormErrorMessage(partnerError)} />
        <FieldGroup>
          {game.canWaitlist ? null : (
            <>
              <Field>
                <FieldLabel htmlFor="partner-side">
                  {m.webGame.addPlayer.side}
                </FieldLabel>
                <Select value={partnerSide} onValueChange={onPartnerSideChange}>
                  <SelectTrigger id="partner-side">
                    <SelectValue placeholder={m.webGame.players.vacantSide} />
                  </SelectTrigger>
                  <SelectContent>
                    {vacantSides.map((side) => (
                      <SelectItem
                        key={side.sideIndex}
                        value={String(side.sideIndex)}
                      >
                        {formatGameSideLabel(
                          game.format,
                          side.sideIndex,
                          locale,
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="partner-position">
                  {m.webGame.players.yourPosition}
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
                    <SelectItem value="left">{m.game.players.left}</SelectItem>
                    <SelectItem value="right">
                      {m.game.players.right}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          <Field>
            <FieldLabel htmlFor="partner-query">
              {m.webGame.players.partner}
            </FieldLabel>
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
            ? m.webGame.registering
            : game.canWaitlist
              ? m.game.cta.joinWaitlist
              : m.game.card.register}
        </Button>
      </form>
    </Card>
  );
}

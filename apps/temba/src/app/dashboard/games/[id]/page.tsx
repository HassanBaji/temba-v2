"use client";

import Link from "next/link";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { GameInvitesDialog } from "~/components/games/game-invites-dialog";
import { GameSeatGrid } from "~/components/games/game-seat-grid";
import { GameWindowFields } from "~/components/games/game-window-fields";
import {
  LookupUserSelect,
  type LookupUserOption,
} from "~/components/invites/lookup-user-select";
import { RowList } from "~/components/common/row-list";
import { DashboardShell } from "~/components/dashboard-shell";
import { Section } from "~/components/layout/section";
import { SportBadge } from "~/components/temba/sport-badge";
import { GameRegistrationStatusBadge } from "~/components/temba/typed-labels";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import {
  formatGameWindowName,
  parseRequiredGameWindow,
  splitGameWindow,
} from "~/lib/game-window";
import {
  centsToMajorInput,
  formatPricePerPlayerCents,
  parseOptionalPricePerPlayerCents,
  PRICE_PER_PLAYER_FIELD_DESCRIPTION,
} from "~/lib/price-per-player";

function formatWhen(value: Date | string | null | undefined) {
  if (!value) {
    return "Not set";
  }
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function optionalSelectId(value: string) {
  return value === "none" || value.length === 0 ? null : value;
}

function gameTeamLabel(side: {
  members: { name: string }[];
  name: string | null;
}) {
  if (side.members.length > 0) {
    return side.members.map((member) => member.name).join(" / ");
  }
  return side.name ?? "Game team";
}

function slotLabel(
  sides: { id: string; members: { name: string }[]; name: string | null }[],
  gameTeamId: string | null,
) {
  if (!gameTeamId) {
    return "empty";
  }
  const side = sides.find((row) => row.id === gameTeamId);
  return side ? gameTeamLabel(side) : "empty";
}

export default function GameHomePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const utils = api.useUtils();
  const game = api.games.byId.useQuery({ id });

  const [partnerQuery, setPartnerQuery] = React.useState("");
  const [selectedPartner, setSelectedPartner] = React.useState<
    LookupUserOption[]
  >([]);
  const [partnerSide, setPartnerSide] = React.useState("");
  const [partnerPosition, setPartnerPosition] = React.useState<
    "left" | "right"
  >("left");
  const [teamId, setTeamId] = React.useState<string>("");
  const [windowDay, setWindowDay] = React.useState("");
  const [windowStartTime, setWindowStartTime] = React.useState("");
  const [windowFinishTime, setWindowFinishTime] = React.useState("");
  const [pricePerPlayer, setPricePerPlayer] = React.useState("");
  const [pricePerPlayerError, setPricePerPlayerError] = React.useState<
    string | undefined
  >();
  const priceSummaryRef = React.useRef<HTMLDivElement>(null);
  const [setScores, setSetScores] = React.useState<
    Record<string, { slot1: string; slot2: string }>
  >({});
  const [lookupQuery, setLookupQuery] = React.useState("");
  const [lookupRefused, setLookupRefused] = React.useState<
    { name: string; message: string }[] | null
  >(null);
  const [invitesOpen, setInvitesOpen] = React.useState(false);
  const inviteButtonRef = React.useRef<HTMLButtonElement>(null);

  const registerSeat = api.games.registerSeat.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Seated");
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const moveSeat = api.games.moveSeat.useMutation({
    onSuccess: async () => {
      toast.success("Moved");
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Registered");
      setPartnerQuery("");
      setSelectedPartner([]);
      setPartnerSide("");
      setPartnerPosition("left");
      await utils.games.byId.invalidate({ id });
      await utils.games.searchPartnerUsers.invalidate({ gameId: id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const registerTeam = api.games.registerTeam.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.waitlisted ? "Team joined waitlist" : "Team registered",
      );
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const leaveGame = api.games.leave.useMutation({
    onSuccess: async () => {
      toast.success("Left Game");
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: async () => {
      toast.success("Left waitlist");
      await utils.games.byId.invalidate({ id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  async function refreshGame() {
    await utils.games.byId.invalidate({ id });
    await utils.users.home.invalidate();
    await utils.games.listPublicPickup.invalidate();
    await utils.games.listMyGroups.invalidate();
  }

  const kick = api.games.kick.useMutation({
    onSuccess: async () => {
      toast.success("Removed");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const closeRegistration = api.games.closeRegistration.useMutation({
    onSuccess: async () => {
      toast.success("Registration closed");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const reopenRegistration = api.games.reopenRegistration.useMutation({
    onSuccess: async () => {
      toast.success("Registration reopened");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const cancelGame = api.games.cancel.useMutation({
    onSuccess: async () => {
      toast.success("Game cancelled");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const cancelMatch = api.games.cancelMatch.useMutation({
    onSuccess: async (result) => {
      toast.success(
        result.cancelledGame ? "Game cancelled" : "Match cancelled",
      );
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const updateWindow = api.games.updateWindow.useMutation({
    onSuccess: async () => {
      toast.success("Window updated");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const updatePricePerPlayer = api.games.updatePricePerPlayer.useMutation({
    onSuccess: async () => {
      toast.success("Price per player saved");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        { pricePerPlayerCents: "edit-price-per-player" },
        priceSummaryRef.current,
      );
    },
  });

  const updateMatch = api.games.updateMatch.useMutation({
    onSuccess: async () => {
      toast.success("Match updated");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const scoreSet = api.games.scoreSet.useMutation({
    onSuccess: async () => {
      toast.success("Set saved");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const completeMatch = api.games.completeMatch.useMutation({
    onSuccess: async () => {
      toast.success("Match completed");
      await refreshGame();
      await utils.ratings.me.invalidate();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const sendLookupInvite = api.games.sendLookupInvite.useMutation({
    onSuccess: async (result) => {
      setLookupRefused(result.refused);
      if (result.sent.length > 0) {
        toast.success(
          result.sent.length === 1
            ? "Lookup invite sent"
            : `${result.sent.length} Lookup invites sent`,
        );
      }
      await utils.games.listLookupInvites.invalidate({ gameId: id });
      await utils.games.searchLookupUsers.invalidate({ gameId: id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const createInviteLink = api.games.createInviteLink.useMutation({
    onSuccess: async (result) => {
      await navigator.clipboard.writeText(result.inviteUrl);
      toast.success("Invite link copied");
      await utils.games.getInviteLink.invalidate({ gameId: id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const data = game.data;
  const pricePerPlayerLabel = formatPricePerPlayerCents(
    data?.pricePerPlayerCents,
  );
  const firstEligibleTeam = data?.eligibleTeams[0]?.id ?? "";
  const courts = api.games.listCourts.useQuery(
    { gameId: id },
    {
      enabled: Boolean(
        data?.isOrganizer &&
          (data.format === "friendly_tournament" ||
            data.format === "friendly_game"),
      ),
    },
  );
  const canSendGameLookup = Boolean(
    data?.isOrganizer &&
      data.registrationMode !== "team_only" &&
      !data.cancelledAt &&
      !data.joinFrozen,
  );
  const lookupSearch = api.games.searchLookupUsers.useQuery(
    { gameId: id, query: lookupQuery },
    { enabled: invitesOpen && canSendGameLookup },
  );
  const canPartnerPick = Boolean(
    data &&
      (data.canRegister || data.canWaitlist) &&
      data.registrationMode === "individual" &&
      data.format !== "americano",
  );
  const partnerSearch = api.games.searchPartnerUsers.useQuery(
    { gameId: id, query: partnerQuery },
    { enabled: canPartnerPick },
  );
  const inviteLink = api.games.getInviteLink.useQuery(
    { gameId: id },
    { enabled: Boolean(data?.isOrganizer && !data.joinFrozen) },
  );

  React.useEffect(() => {
    if (firstEligibleTeam && teamId.length === 0) {
      setTeamId(firstEligibleTeam);
    }
  }, [firstEligibleTeam, teamId.length]);

  React.useEffect(() => {
    if (!data) {
      return;
    }
    const gameWindow = splitGameWindow(data.windowStart, data.windowEnd);
    setWindowDay(gameWindow.day);
    setWindowStartTime(gameWindow.startTime);
    setWindowFinishTime(gameWindow.finishTime);
    setPricePerPlayer(centsToMajorInput(data.pricePerPlayerCents));
    setPricePerPlayerError(undefined);
    const nextScores: Record<string, { slot1: string; slot2: string }> = {};
    for (const match of data.matches) {
      for (const set of match.sets) {
        nextScores[set.id] = {
          slot1: set.slot1GamesWon == null ? "" : String(set.slot1GamesWon),
          slot2: set.slot2GamesWon == null ? "" : String(set.slot2GamesWon),
        };
      }
    }
    setSetScores(nextScores);
  }, [data]);

  const canManageGameInvites = Boolean(
    data?.isOrganizer && !data.cancelledAt && !data.joinFrozen,
  );

  return (
    <DashboardShell
      title={data?.name ?? "Game"}
      action={
        canManageGameInvites ? (
          <Button
            ref={inviteButtonRef}
            type="button"
            onClick={() => setInvitesOpen(true)}
          >
            Invite
          </Button>
        ) : null
      }
    >
      <div className="space-y-8">
        {game.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : null}

        {game.error ? (
          <ErrorState
            title="Game could not be loaded"
            message={game.error.message}
            onRetry={() => {
              void game.refetch();
            }}
          />
        ) : null}

        {data ? (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  {data.groupId ? (
                    <p className="text-muted-foreground text-sm">
                      On Group{" "}
                      <Link
                        href={`/dashboard/groups/${data.groupId}`}
                        className="hover:text-foreground underline underline-offset-2"
                      >
                        {data.groupName ?? "Group"}
                      </Link>
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Groupless Game
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <GameRegistrationStatusBadge
                    status={data.registrationStatus}
                  />
                  {data.sport ? <SportBadge sport={data.sport} /> : null}
                </div>
              </div>
              <p className="text-muted-foreground text-sm">
                Window {formatWhen(data.windowStart)} –{" "}
                {formatWhen(data.windowEnd)}. Cap{" "}
                {data.registrationMode === "team_only"
                  ? `${data.registeredTeamCount} / ${data.teamsAllowed ?? 2} Teams`
                  : `${data.registeredUserCount} / ${data.playersAllowed ?? 4} players`}
                .
              </p>
              {data.venue ? (
                <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
                  <span>Venue {data.venue.name}</span>
                  {data.venue.archivedAt ? (
                    <Badge variant="outline">Soft-archived</Badge>
                  ) : null}
                </p>
              ) : null}
              {pricePerPlayerLabel ? (
                <p className="text-muted-foreground text-sm">
                  Price per player {pricePerPlayerLabel}
                </p>
              ) : null}
              {data.joinFrozen && !data.cancelledAt ? (
                <p className="text-muted-foreground text-sm">
                  This Club Group’s Community is Soft-archived. Register,
                  waitlist, Lookup, and Invite link mint and accept stay closed.
                  Reopen is refused.
                </p>
              ) : null}
            </div>

            {data.isOrganizer && !data.cancelledAt ? (
              <Card variant="outlined" className="space-y-4">
                <h3 className="text-title font-medium">Organizer</h3>
                <p className="text-muted-foreground text-sm">
                  Venue cannot change.
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.registrationClosedAt ? (
                    <Button
                      variant="outline"
                      onClick={() => reopenRegistration.mutate({ gameId: id })}
                      disabled={reopenRegistration.isPending || data.joinFrozen}
                    >
                      {reopenRegistration.isPending
                        ? "Reopening…"
                        : "Reopen registration"}
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => closeRegistration.mutate({ gameId: id })}
                      disabled={closeRegistration.isPending}
                    >
                      {closeRegistration.isPending
                        ? "Closing…"
                        : "Close registration"}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => cancelGame.mutate({ gameId: id })}
                    disabled={cancelGame.isPending}
                  >
                    {cancelGame.isPending ? "Cancelling…" : "Cancel Game"}
                  </Button>
                </div>
                {data.joinFrozen ? (
                  <p className="text-muted-foreground text-sm">
                    Join doors stay closed while the Community is Soft-archived.
                    Reopen is refused.
                  </p>
                ) : null}
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (updateWindow.isPending) {
                      return;
                    }
                    const gameWindow = parseRequiredGameWindow(
                      windowDay,
                      windowStartTime,
                      windowFinishTime,
                    );
                    if (!gameWindow) {
                      return;
                    }
                    updateWindow.mutate({
                      gameId: id,
                      name: formatGameWindowName(
                        windowDay,
                        windowStartTime,
                        windowFinishTime,
                      ),
                      windowStart: gameWindow.windowStart,
                      windowEnd: gameWindow.windowEnd,
                    });
                  }}
                >
                  <FormErrorSummary
                    message={globalFormErrorMessage(updateWindow.error)}
                  />
                  <GameWindowFields
                    dayId="edit-window-day"
                    startId="edit-window-start"
                    finishId="edit-window-finish"
                    day={windowDay}
                    startTime={windowStartTime}
                    finishTime={windowFinishTime}
                    onDayChange={setWindowDay}
                    onStartTimeChange={setWindowStartTime}
                    onFinishTimeChange={setWindowFinishTime}
                    startError={fieldErrorMessage(
                      updateWindow.error,
                      "windowStart",
                    )}
                    finishError={fieldErrorMessage(
                      updateWindow.error,
                      "windowEnd",
                    )}
                  />
                  <Button type="submit" disabled={updateWindow.isPending}>
                    {updateWindow.isPending ? "Saving…" : "Save window"}
                  </Button>
                </form>
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (updatePricePerPlayer.isPending) {
                      return;
                    }
                    setPricePerPlayerError(undefined);
                    const parsedPrice =
                      parseOptionalPricePerPlayerCents(pricePerPlayer);
                    if (!parsedPrice.ok) {
                      setPricePerPlayerError(parsedPrice.message);
                      document.getElementById("edit-price-per-player")?.focus();
                      return;
                    }
                    updatePricePerPlayer.mutate({
                      gameId: id,
                      pricePerPlayerCents: parsedPrice.cents,
                    });
                  }}
                >
                  <FormErrorSummary
                    ref={priceSummaryRef}
                    message={globalFormErrorMessage(updatePricePerPlayer.error)}
                  />
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="edit-price-per-player">
                        Price per player
                      </FieldLabel>
                      <Input
                        id="edit-price-per-player"
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricePerPlayer}
                        onChange={(event) => {
                          setPricePerPlayer(event.target.value);
                          setPricePerPlayerError(undefined);
                        }}
                        aria-invalid={
                          pricePerPlayerError ||
                          fieldErrorMessage(
                            updatePricePerPlayer.error,
                            "pricePerPlayerCents",
                          )
                            ? true
                            : undefined
                        }
                        aria-describedby={
                          pricePerPlayerError ||
                          fieldErrorMessage(
                            updatePricePerPlayer.error,
                            "pricePerPlayerCents",
                          )
                            ? "edit-price-per-player-error"
                            : "edit-price-per-player-copy"
                        }
                      />
                      <FieldDescription id="edit-price-per-player-copy">
                        {PRICE_PER_PLAYER_FIELD_DESCRIPTION}
                      </FieldDescription>
                      <FieldError id="edit-price-per-player-error">
                        {pricePerPlayerError ??
                          fieldErrorMessage(
                            updatePricePerPlayer.error,
                            "pricePerPlayerCents",
                          )}
                      </FieldError>
                    </Field>
                  </FieldGroup>
                  <Button
                    type="submit"
                    disabled={updatePricePerPlayer.isPending}
                  >
                    {updatePricePerPlayer.isPending
                      ? "Saving…"
                      : "Save price per player"}
                  </Button>
                </form>
                {data.format === "friendly_game" ? (
                  <p className="text-muted-foreground text-sm">
                    Friendly game caps stay 4 players / 2 Teams.
                  </p>
                ) : null}
              </Card>
            ) : null}

            <Section title="Matches">
              {data.matches.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {data.format === "americano"
                    ? "Americano has no Matches this slice."
                    : "No Matches on this Game."}
                </p>
              ) : (
                <RowList>
                  {data.matches.map((match) => (
                    <li key={match.id} className="space-y-3 px-4 py-4">
                      <p className="text-foreground font-medium">
                        {formatWhen(match.startTime)} –{" "}
                        {formatWhen(match.endTime)}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        {(match.status ?? "pending").replaceAll("_", " ")}
                        {match.durationInMinutes
                          ? ` · ${match.durationInMinutes} min`
                          : ""}
                        {match.courtName
                          ? ` · ${match.courtName}`
                          : " · no Court"}
                        {` · Team 1 ${slotLabel(data.gameTeams, match.slot1GameTeamId)} · Team 2 ${slotLabel(data.gameTeams, match.slot2GameTeamId)}`}
                      </p>
                      {data.isOrganizer &&
                      !data.cancelledAt &&
                      match.status !== "cancelled" &&
                      (data.format === "friendly_tournament" ||
                        data.format === "friendly_game") ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor={`match-${match.id}-court`}>
                              Court
                            </FieldLabel>
                            <Select
                              value={match.courtId ?? "none"}
                              onValueChange={(value) => {
                                const courtId = optionalSelectId(value);
                                if (data.format === "friendly_game") {
                                  updateMatch.mutate({
                                    gameId: id,
                                    matchId: match.id,
                                    courtId,
                                  });
                                  return;
                                }
                                updateMatch.mutate({
                                  gameId: id,
                                  matchId: match.id,
                                  startTime: match.startTime,
                                  endTime: match.endTime,
                                  durationInMinutes: match.durationInMinutes,
                                  courtId,
                                  slot1GameTeamId: match.slot1GameTeamId,
                                  slot2GameTeamId: match.slot2GameTeamId,
                                });
                              }}
                            >
                              <SelectTrigger id={`match-${match.id}-court`}>
                                <SelectValue placeholder="Court" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No Court</SelectItem>
                                {(courts.data ?? []).map((court) => (
                                  <SelectItem key={court.id} value={court.id}>
                                    {court.venueName}: {court.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          {data.format === "friendly_tournament" ? (
                            <>
                              <Field>
                                <FieldLabel htmlFor={`match-${match.id}-slot1`}>
                                  Team 1
                                </FieldLabel>
                                <Select
                                  value={match.slot1GameTeamId ?? "none"}
                                  onValueChange={(value) =>
                                    updateMatch.mutate({
                                      gameId: id,
                                      matchId: match.id,
                                      startTime: match.startTime,
                                      endTime: match.endTime,
                                      durationInMinutes:
                                        match.durationInMinutes,
                                      courtId: match.courtId,
                                      slot1GameTeamId: optionalSelectId(value),
                                      slot2GameTeamId: match.slot2GameTeamId,
                                    })
                                  }
                                >
                                  <SelectTrigger id={`match-${match.id}-slot1`}>
                                    <SelectValue placeholder="Team 1" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      Team 1 empty
                                    </SelectItem>
                                    {data.gameTeams.map((side) => (
                                      <SelectItem key={side.id} value={side.id}>
                                        {gameTeamLabel(side)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>
                              <Field>
                                <FieldLabel htmlFor={`match-${match.id}-slot2`}>
                                  Team 2
                                </FieldLabel>
                                <Select
                                  value={match.slot2GameTeamId ?? "none"}
                                  onValueChange={(value) =>
                                    updateMatch.mutate({
                                      gameId: id,
                                      matchId: match.id,
                                      startTime: match.startTime,
                                      endTime: match.endTime,
                                      durationInMinutes:
                                        match.durationInMinutes,
                                      courtId: match.courtId,
                                      slot1GameTeamId: match.slot1GameTeamId,
                                      slot2GameTeamId: optionalSelectId(value),
                                    })
                                  }
                                >
                                  <SelectTrigger id={`match-${match.id}-slot2`}>
                                    <SelectValue placeholder="Team 2" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      Team 2 empty
                                    </SelectItem>
                                    {data.gameTeams.map((side) => (
                                      <SelectItem key={side.id} value={side.id}>
                                        {gameTeamLabel(side)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>
                            </>
                          ) : null}
                        </div>
                      ) : null}
                      {data.isOrganizer &&
                      !data.cancelledAt &&
                      match.status !== "cancelled" &&
                      data.format !== "americano" ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            cancelMatch.mutate({
                              gameId: id,
                              matchId: match.id,
                            })
                          }
                          disabled={cancelMatch.isPending}
                        >
                          {data.format === "friendly_game"
                            ? "Cancel Match (cancels Game)"
                            : "Cancel Match"}
                        </Button>
                      ) : null}
                      {data.format !== "americano" ? (
                        <div className="space-y-3">
                          <p className="text-foreground text-sm font-medium">
                            Sets
                            {match.outcome.result === "draw"
                              ? " · Match draw"
                              : match.outcome.result === "slot1"
                                ? " · Team 1 leads"
                                : match.outcome.result === "slot2"
                                  ? " · Team 2 leads"
                                  : " · no result yet"}
                            {` · ${match.outcome.slot1SetWins}–${match.outcome.slot2SetWins} Set-wins`}
                          </p>
                          {match.sets.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              No Sets on this Match.
                            </p>
                          ) : (
                            <ul className="space-y-3">
                              {match.sets.map((set, index) => {
                                const scores = setScores[set.id] ?? {
                                  slot1: "",
                                  slot2: "",
                                };
                                return (
                                  <li
                                    key={set.id}
                                    className="flex flex-wrap items-end gap-2"
                                  >
                                    <p className="text-muted-foreground w-12 text-sm">
                                      Set {index + 1}
                                    </p>
                                    <Field>
                                      <FieldLabel
                                        htmlFor={`set-${set.id}-slot1`}
                                      >
                                        Team 1 games
                                      </FieldLabel>
                                      <Input
                                        type="number"
                                        min={0}
                                        id={`set-${set.id}-slot1`}
                                        className="w-20"
                                        value={scores.slot1}
                                        disabled={!match.canScoreSets}
                                        onChange={(event) =>
                                          setSetScores((current) => ({
                                            ...current,
                                            [set.id]: {
                                              slot1: event.target.value,
                                              slot2: scores.slot2,
                                            },
                                          }))
                                        }
                                      />
                                    </Field>
                                    <span className="text-muted-foreground text-sm">
                                      –
                                    </span>
                                    <Field>
                                      <FieldLabel
                                        htmlFor={`set-${set.id}-slot2`}
                                      >
                                        Team 2 games
                                      </FieldLabel>
                                      <Input
                                        type="number"
                                        min={0}
                                        id={`set-${set.id}-slot2`}
                                        className="w-20"
                                        value={scores.slot2}
                                        disabled={!match.canScoreSets}
                                        onChange={(event) =>
                                          setSetScores((current) => ({
                                            ...current,
                                            [set.id]: {
                                              slot1: scores.slot1,
                                              slot2: event.target.value,
                                            },
                                          }))
                                        }
                                      />
                                    </Field>
                                    {set.wins ? (
                                      <p className="text-muted-foreground text-sm">
                                        {set.wins.slot1SetWins === 0 &&
                                        set.wins.slot2SetWins === 0
                                          ? "Set draw"
                                          : `${set.wins.slot1SetWins}–${set.wins.slot2SetWins}`}
                                      </p>
                                    ) : null}
                                    {match.canScoreSets ? (
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          if (
                                            scores.slot1.trim().length === 0 ||
                                            scores.slot2.trim().length === 0
                                          ) {
                                            toast.error(
                                              "Enter games won for both teams",
                                            );
                                            return;
                                          }
                                          scoreSet.mutate({
                                            gameId: id,
                                            matchId: match.id,
                                            setId: set.id,
                                            slot1GamesWon: Number(scores.slot1),
                                            slot2GamesWon: Number(scores.slot2),
                                          });
                                        }}
                                        disabled={scoreSet.isPending}
                                      >
                                        Save
                                      </Button>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {match.canComplete ? (
                              <Button
                                type="button"
                                onClick={() =>
                                  completeMatch.mutate({
                                    gameId: id,
                                    matchId: match.id,
                                  })
                                }
                                disabled={completeMatch.isPending}
                              >
                                Complete Match
                              </Button>
                            ) : null}
                          </div>
                          {(!match.bothSidesComplete ||
                            !match.bothSlotsFilled) &&
                          match.status !== "completed" ? (
                            <p className="text-muted-foreground text-sm">
                              Scoring is frozen until both teams have two
                              Positions.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </RowList>
              )}
            </Section>

            <Section
              title={
                data.format === "americano"
                  ? "Player pool"
                  : data.registrationMode === "individual"
                    ? "Sides"
                    : "Registered"
              }
            >
              {data.registrationMode === "individual" &&
              data.format !== "americano" ? (
                <div className="space-y-4">
                  <GameSeatGrid
                    sides={data.sides}
                    canJoinVacant={
                      data.canRegister || data.canWaitlist || data.canPickSeat
                    }
                    joinLabel={
                      data.canWaitlist && !data.canPickSeat
                        ? "Join waitlist"
                        : "Sit here"
                    }
                    joining={registerSeat.isPending}
                    canMove={data.canMove}
                    moving={moveSeat.isPending}
                    isOrganizer={data.isOrganizer}
                    cancelled={Boolean(data.cancelledAt)}
                    kickPending={kick.isPending}
                    onJoin={(sideIndex, position) =>
                      registerSeat.mutate({
                        gameId: id,
                        sideIndex,
                        position,
                      })
                    }
                    onMove={(sideIndex, position) =>
                      moveSeat.mutate({
                        gameId: id,
                        sideIndex,
                        position,
                      })
                    }
                    onKick={(userId) =>
                      kick.mutate({
                        gameId: id,
                        userId,
                      })
                    }
                    sideNoun={
                      data.format === "friendly_tournament" ? "Side" : "Team"
                    }
                  />
                  {data.canPickSeat ? (
                    <p className="text-muted-foreground text-sm">
                      Pick a vacant Position to occupy a side.
                    </p>
                  ) : null}
                  {data.unseatedPlayers.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-sm">
                        These Users must pick a vacant Position before they
                        occupy a side.
                      </p>
                      <RowList>
                        {data.unseatedPlayers.map((player) => (
                          <li
                            key={player.id}
                            className="flex flex-wrap items-center justify-between gap-2 px-4 py-4"
                          >
                            <p className="text-foreground font-medium">
                              {player.name}
                            </p>
                            {data.isOrganizer && !data.cancelledAt ? (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  kick.mutate({
                                    gameId: id,
                                    userId: player.id,
                                  })
                                }
                                disabled={kick.isPending}
                              >
                                Kick
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </RowList>
                    </div>
                  ) : null}
                  {data.sides.every(
                    (side) => side.left == null && side.right == null,
                  ) && data.unseatedPlayers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      Nobody is seated yet. Pick a vacant Position.
                    </p>
                  ) : null}
                </div>
              ) : data.gameTeams.length === 0 &&
                data.registeredPlayers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nobody is registered yet.
                </p>
              ) : (
                <RowList>
                  {data.gameTeams.map((side) => {
                    const firstMember = side.members[0];
                    return (
                      <li
                        key={side.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-4"
                      >
                        <p className="text-foreground font-medium">
                          {side.members.length > 0
                            ? side.members
                                .map((member) => member.name)
                                .join(" / ")
                            : (side.name ?? "Game team")}
                        </p>
                        {data.isOrganizer &&
                        !data.cancelledAt &&
                        firstMember ? (
                          <Button
                            variant="outline"
                            onClick={() =>
                              kick.mutate({
                                gameId: id,
                                userId: firstMember.id,
                              })
                            }
                            disabled={kick.isPending}
                          >
                            Kick
                          </Button>
                        ) : null}
                      </li>
                    );
                  })}
                  {data.registeredPlayers
                    .filter(
                      (player) =>
                        !data.gameTeams.some((side) =>
                          side.members.some(
                            (member) => member.id === player.id,
                          ),
                        ),
                    )
                    .map((player) => (
                      <li
                        key={player.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-4"
                      >
                        <p className="text-foreground font-medium">
                          {player.name}
                        </p>
                        {data.isOrganizer && !data.cancelledAt ? (
                          <Button
                            variant="outline"
                            onClick={() =>
                              kick.mutate({
                                gameId: id,
                                userId: player.id,
                              })
                            }
                            disabled={kick.isPending}
                          >
                            Kick
                          </Button>
                        ) : null}
                      </li>
                    ))}
                </RowList>
              )}
            </Section>

            <Section title="Waitlist">
              {data.waitlist.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Waitlist is empty.
                </p>
              ) : (
                <RowList aria-label="Waitlist">
                  {data.waitlist.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-4"
                    >
                      <p className="text-foreground font-medium">
                        {index + 1}. {entry.name}
                      </p>
                      {data.isOrganizer && !data.cancelledAt ? (
                        <Button
                          variant="outline"
                          onClick={() =>
                            kick.mutate({
                              gameId: id,
                              waitlistId: entry.id,
                            })
                          }
                          disabled={kick.isPending}
                        >
                          Kick
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </RowList>
              )}
            </Section>
            {data.isRegistered ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-muted-foreground text-sm">
                  You are registered on this Game.
                </p>
                {data.canLeave ? (
                  <Button
                    variant="outline"
                    onClick={() => leaveGame.mutate({ gameId: id })}
                    disabled={leaveGame.isPending}
                  >
                    {leaveGame.isPending ? "Leaving…" : "Leave Game"}
                  </Button>
                ) : null}
              </div>
            ) : null}

            {data.isWaitlisted ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-muted-foreground text-sm">
                  You are on the waitlist.
                </p>
                <Button
                  variant="outline"
                  onClick={() => leaveWaitlist.mutate({ gameId: id })}
                  disabled={leaveWaitlist.isPending}
                >
                  {leaveWaitlist.isPending ? "Leaving…" : "Leave waitlist"}
                </Button>
              </div>
            ) : null}

            {data.canWaitlist &&
            data.registrationMode === "individual" &&
            data.format !== "americano" ? (
              <Card variant="outlined" className="space-y-3">
                <h3 className="text-title font-medium">Join the waitlist</h3>
                <p className="text-muted-foreground text-sm">
                  The Game is full. Join the waitlist alone. You promote into a
                  vacated Position.
                </p>
                <Button
                  onClick={() => registerSeat.mutate({ gameId: id })}
                  disabled={registerSeat.isPending}
                >
                  {registerSeat.isPending ? "Joining…" : "Join waitlist"}
                </Button>
              </Card>
            ) : null}

            {(data.canRegister || data.canWaitlist) &&
            data.registrationMode === "individual" &&
            data.format !== "americano" ? (
              <Card variant="outlined">
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (registerWithPartner.isPending) {
                      return;
                    }
                    const vacantSides = data.sides.filter(
                      (side) => side.left == null && side.right == null,
                    );
                    if (data.canWaitlist) {
                      const partnerUserId = selectedPartner[0]?.id;
                      if (!partnerUserId) {
                        return;
                      }
                      registerWithPartner.mutate({
                        gameId: id,
                        partnerUserId,
                      });
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
                    registerWithPartner.mutate({
                      gameId: id,
                      partnerUserId,
                      sideIndex,
                      position: partnerPosition,
                    });
                  }}
                >
                  <h3 className="text-title font-medium">
                    {data.canWaitlist
                      ? "Join waitlist with a partner"
                      : "Register with a partner"}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {data.canWaitlist
                      ? "The Game is full. You both join the waitlist as separate rows and each promote alone."
                      : data.sides.every(
                            (side) => side.left != null || side.right != null,
                          )
                        ? "No fully vacant side. Pick a vacant Position instead."
                        : "Take one fully vacant side. You pick left or right; your partner gets the other."}
                  </p>
                  <FormErrorSummary
                    message={globalFormErrorMessage(registerWithPartner.error)}
                  />
                  <FieldGroup>
                    {data.canWaitlist ? null : (
                      <>
                        <Field>
                          <FieldLabel htmlFor="partner-side">Side</FieldLabel>
                          <Select
                            value={partnerSide}
                            onValueChange={setPartnerSide}
                          >
                            <SelectTrigger id="partner-side">
                              <SelectValue placeholder="Vacant side" />
                            </SelectTrigger>
                            <SelectContent>
                              {data.sides
                                .filter(
                                  (side) =>
                                    side.left == null && side.right == null,
                                )
                                .map((side) => (
                                  <SelectItem
                                    key={side.sideIndex}
                                    value={String(side.sideIndex)}
                                  >
                                    {data.format === "friendly_game"
                                      ? `Team ${side.sideIndex}`
                                      : `Side ${side.sideIndex}`}
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
                              setPartnerPosition(value as "left" | "right")
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
                        onQueryChange={setPartnerQuery}
                        options={partnerSearch.data}
                        selected={selectedPartner}
                        onSelectedChange={setSelectedPartner}
                        selection="single"
                        pending={partnerSearch.isFetching}
                        disabled={registerWithPartner.isPending}
                        error={Boolean(
                          fieldErrorMessage(
                            registerWithPartner.error,
                            "partnerUserId",
                          ),
                        )}
                        describedBy={
                          fieldErrorMessage(
                            registerWithPartner.error,
                            "partnerUserId",
                          )
                            ? "partner-query-error"
                            : undefined
                        }
                      />
                      <FieldDescription>
                        Pick an existing User. You both register or waitlist
                        immediately.
                      </FieldDescription>
                      <FieldError id="partner-query-error">
                        {fieldErrorMessage(
                          registerWithPartner.error,
                          "partnerUserId",
                        )}
                      </FieldError>
                    </Field>
                  </FieldGroup>
                  <Button
                    type="submit"
                    disabled={
                      registerWithPartner.isPending ||
                      selectedPartner.length === 0 ||
                      (data.canRegister &&
                        data.sides.every(
                          (side) => side.left != null || side.right != null,
                        ))
                    }
                  >
                    {registerWithPartner.isPending
                      ? "Registering…"
                      : data.canWaitlist
                        ? "Join waitlist"
                        : "Register"}
                  </Button>
                </form>
              </Card>
            ) : null}

            {(data.canRegister || data.canWaitlist) &&
            data.registrationMode === "team_only" ? (
              <Card variant="outlined">
                <form
                  className="space-y-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (teamId.length === 0) {
                      toast.error("Pick a complete Team");
                      return;
                    }
                    registerTeam.mutate({ gameId: id, teamId });
                  }}
                >
                  <h3 className="text-title font-medium">Register a Team</h3>
                  {data.eligibleTeams.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      You need a complete Team whose both partners are allowed
                      on this Game.
                    </p>
                  ) : (
                    <>
                      <Field>
                        <FieldLabel htmlFor="team-id">Team</FieldLabel>
                        <Select value={teamId} onValueChange={setTeamId}>
                          <SelectTrigger id="team-id">
                            <SelectValue placeholder="Select a Team" />
                          </SelectTrigger>
                          <SelectContent>
                            {data.eligibleTeams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name} ({team.memberNames.join(" / ")})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Button type="submit" disabled={registerTeam.isPending}>
                        {registerTeam.isPending
                          ? "Registering…"
                          : "Register Team"}
                      </Button>
                    </>
                  )}
                </form>
              </Card>
            ) : null}

            {canManageGameInvites ? (
              <GameInvitesDialog
                open={invitesOpen}
                onOpenChange={(next) => {
                  setInvitesOpen(next);
                  if (!next) {
                    setLookupQuery("");
                    setLookupRefused(null);
                  }
                }}
                restoreFocusRef={inviteButtonRef}
                canSendLookup={
                  data.registrationMode !== "team_only" && !data.joinFrozen
                }
                canCopyInviteLink={!data.joinFrozen}
                inviteUrl={inviteLink.data?.inviteUrl}
                sendPending={sendLookupInvite.isPending}
                copyPending={createInviteLink.isPending}
                sendError={sendLookupInvite.error}
                searchQuery={lookupQuery}
                onSearchQueryChange={setLookupQuery}
                searchResults={lookupSearch.data}
                searchPending={lookupSearch.isFetching}
                refused={lookupRefused}
                onSendLookup={(userIds) =>
                  sendLookupInvite.mutate({ gameId: id, userIds })
                }
                onCopyInviteLink={() => createInviteLink.mutate({ gameId: id })}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

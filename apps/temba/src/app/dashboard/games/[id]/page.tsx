"use client";

import Link from "next/link";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import { ErrorState } from "~/components/common/error-state";
import { RowList } from "~/components/common/row-list";
import { DashboardShell } from "~/components/dashboard-shell";
import { Section } from "~/components/layout/section";
import { SportBadge } from "~/components/temba/sport-badge";
import {
  GameFormatBadge,
  GameRegistrationModeBadge,
  GameRegistrationStatusBadge,
} from "~/components/temba/typed-labels";
import { Card } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
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
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";

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

function toDatetimeLocalValue(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseOptionalDate(value: string) {
  if (value.trim().length === 0) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
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
  const [teamId, setTeamId] = React.useState<string>("");
  const [windowStart, setWindowStart] = React.useState("");
  const [windowEnd, setWindowEnd] = React.useState("");
  const [playersAllowed, setPlayersAllowed] = React.useState("4");
  const [teamsAllowed, setTeamsAllowed] = React.useState("2");
  const [matchStart, setMatchStart] = React.useState("");
  const [matchEnd, setMatchEnd] = React.useState("");
  const [matchDuration, setMatchDuration] = React.useState("");
  const [matchCourtId, setMatchCourtId] = React.useState("none");
  const [matchSlot1, setMatchSlot1] = React.useState("none");
  const [matchSlot2, setMatchSlot2] = React.useState("none");
  const [setScores, setSetScores] = React.useState<
    Record<string, { slot1: string; slot2: string }>
  >({});
  const [lookupQuery, setLookupQuery] = React.useState("");

  const registerSelf = api.games.register.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Registered");
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
      await utils.games.byId.invalidate({ id });
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

  const updateCaps = api.games.updateCaps.useMutation({
    onSuccess: async () => {
      toast.success("Cap updated");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const addMatch = api.games.addMatch.useMutation({
    onSuccess: async () => {
      toast.success("Match added");
      setMatchStart("");
      setMatchEnd("");
      setMatchDuration("");
      setMatchCourtId("none");
      setMatchSlot1("none");
      setMatchSlot2("none");
      await refreshGame();
    },
    onError: (error) => {
      toastGlobalFormError(error);
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

  const addSet = api.games.addSet.useMutation({
    onSuccess: async () => {
      toast.success("Set added");
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

  const removeSet = api.games.removeSet.useMutation({
    onSuccess: async () => {
      toast.success("Set removed");
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
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const sendLookupInvite = api.games.sendLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite sent");
      setLookupQuery("");
      await utils.games.listLookupInvites.invalidate({ gameId: id });
    },
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const revokeLookupInvite = api.games.revokeLookupInvite.useMutation({
    onSuccess: async () => {
      toast.success("Lookup invite revoked");
      await utils.games.listLookupInvites.invalidate({ gameId: id });
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
  const firstEligibleTeam = data?.eligibleTeams[0]?.id ?? "";
  const courts = api.games.listCourts.useQuery(
    { gameId: id },
    {
      enabled: Boolean(
        data?.isOrganizer && data.format === "friendly_tournament",
      ),
    },
  );
  const lookupInvites = api.games.listLookupInvites.useQuery(
    { gameId: id },
    {
      enabled: Boolean(
        data?.isOrganizer && data.registrationMode !== "team_only",
      ),
    },
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
    setWindowStart(toDatetimeLocalValue(data.windowStart));
    setWindowEnd(toDatetimeLocalValue(data.windowEnd));
    setPlayersAllowed(String(data.playersAllowed ?? 4));
    setTeamsAllowed(String(data.teamsAllowed ?? 2));
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

  return (
    <DashboardShell title={data?.name ?? "Game"}>
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
                  <GameFormatBadge format={data.format} />
                  <GameRegistrationModeBadge mode={data.registrationMode} />
                  {data.isPublic ? (
                    <Badge variant="outline">Public</Badge>
                  ) : (
                    <Badge variant="outline">Not public</Badge>
                  )}
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
              {data.joinFrozen && !data.cancelledAt ? (
                <p className="text-muted-foreground text-sm">
                  This Club Group’s Community is Soft-archived. Register,
                  waitlist, Lookup, and Invite link mint and accept stay closed.
                  Organizers can still add Matches and assign Courts. Reopen is
                  refused.
                </p>
              ) : null}
            </div>

            {data.isOrganizer && !data.cancelledAt ? (
              <Card variant="outlined" className="space-y-4">
                <h3 className="text-title font-medium">Organizer</h3>
                <p className="text-muted-foreground text-sm">
                  Format, public, and registration mode cannot change.
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
                    Reopen is refused. Scheduling Matches and Courts still
                    works.
                  </p>
                ) : null}
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (updateWindow.isPending) {
                      return;
                    }
                    updateWindow.mutate({
                      gameId: id,
                      windowStart: parseOptionalDate(windowStart),
                      windowEnd: parseOptionalDate(windowEnd),
                    });
                  }}
                >
                  <FormErrorSummary
                    message={globalFormErrorMessage(updateWindow.error)}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="edit-window-start">
                        Window start
                      </FieldLabel>
                      <Input
                        id="edit-window-start"
                        type="datetime-local"
                        value={windowStart}
                        onChange={(event) => setWindowStart(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="edit-window-end">
                        Window end
                      </FieldLabel>
                      <Input
                        id="edit-window-end"
                        type="datetime-local"
                        value={windowEnd}
                        onChange={(event) => setWindowEnd(event.target.value)}
                      />
                    </Field>
                  </div>
                  <Button type="submit" disabled={updateWindow.isPending}>
                    {updateWindow.isPending ? "Saving…" : "Save window"}
                  </Button>
                </form>
                {data.format !== "friendly_game" ? (
                  <form
                    className="space-y-3"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (data.registrationMode === "team_only") {
                        updateCaps.mutate({
                          gameId: id,
                          teamsAllowed: Number(teamsAllowed),
                        });
                        return;
                      }
                      updateCaps.mutate({
                        gameId: id,
                        playersAllowed: Number(playersAllowed),
                      });
                    }}
                  >
                    {data.registrationMode === "team_only" ? (
                      <Field>
                        <FieldLabel htmlFor="edit-teams-allowed">
                          Teams allowed
                        </FieldLabel>
                        <Input
                          id="edit-teams-allowed"
                          type="number"
                          min={2}
                          value={teamsAllowed}
                          onChange={(event) =>
                            setTeamsAllowed(event.target.value)
                          }
                        />
                      </Field>
                    ) : (
                      <Field>
                        <FieldLabel htmlFor="edit-players-allowed">
                          Players allowed
                        </FieldLabel>
                        <Input
                          id="edit-players-allowed"
                          type="number"
                          min={4}
                          step={4}
                          value={playersAllowed}
                          onChange={(event) =>
                            setPlayersAllowed(event.target.value)
                          }
                        />
                        <FieldDescription>
                          Multiple of 4, not below the current registered count.
                        </FieldDescription>
                      </Field>
                    )}
                    <Button type="submit" disabled={updateCaps.isPending}>
                      {updateCaps.isPending ? "Saving…" : "Save cap"}
                    </Button>
                  </form>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Friendly game caps stay 4 players / 2 Teams.
                  </p>
                )}
              </Card>
            ) : null}

            <Section title="Matches">
              {data.matches.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {data.format === "americano"
                    ? "Americano has no Matches this slice."
                    : data.format === "friendly_tournament"
                      ? "No Matches yet. Organizers can add them anytime."
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
                        {` · slot 1 ${slotLabel(data.gameTeams, match.slot1GameTeamId)} · slot 2 ${slotLabel(data.gameTeams, match.slot2GameTeamId)}`}
                      </p>
                      {data.isOrganizer &&
                      !data.cancelledAt &&
                      match.status !== "cancelled" &&
                      data.format === "friendly_tournament" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor={`match-${match.id}-court`}>
                              Court
                            </FieldLabel>
                            <Select
                              value={match.courtId ?? "none"}
                              onValueChange={(value) =>
                                updateMatch.mutate({
                                  gameId: id,
                                  matchId: match.id,
                                  startTime: match.startTime,
                                  endTime: match.endTime,
                                  durationInMinutes: match.durationInMinutes,
                                  courtId: optionalSelectId(value),
                                  slot1GameTeamId: match.slot1GameTeamId,
                                  slot2GameTeamId: match.slot2GameTeamId,
                                })
                              }
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
                          <Field>
                            <FieldLabel htmlFor={`match-${match.id}-slot1`}>
                              Slot 1
                            </FieldLabel>
                            <Select
                              value={match.slot1GameTeamId ?? "none"}
                              onValueChange={(value) =>
                                updateMatch.mutate({
                                  gameId: id,
                                  matchId: match.id,
                                  startTime: match.startTime,
                                  endTime: match.endTime,
                                  durationInMinutes: match.durationInMinutes,
                                  courtId: match.courtId,
                                  slot1GameTeamId: optionalSelectId(value),
                                  slot2GameTeamId: match.slot2GameTeamId,
                                })
                              }
                            >
                              <SelectTrigger id={`match-${match.id}-slot1`}>
                                <SelectValue placeholder="Slot 1" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  Slot 1 empty
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
                              Slot 2
                            </FieldLabel>
                            <Select
                              value={match.slot2GameTeamId ?? "none"}
                              onValueChange={(value) =>
                                updateMatch.mutate({
                                  gameId: id,
                                  matchId: match.id,
                                  startTime: match.startTime,
                                  endTime: match.endTime,
                                  durationInMinutes: match.durationInMinutes,
                                  courtId: match.courtId,
                                  slot1GameTeamId: match.slot1GameTeamId,
                                  slot2GameTeamId: optionalSelectId(value),
                                })
                              }
                            >
                              <SelectTrigger id={`match-${match.id}-slot2`}>
                                <SelectValue placeholder="Slot 2" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">
                                  Slot 2 empty
                                </SelectItem>
                                {data.gameTeams.map((side) => (
                                  <SelectItem key={side.id} value={side.id}>
                                    {gameTeamLabel(side)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
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
                                ? " · Slot 1 leads"
                                : match.outcome.result === "slot2"
                                  ? " · Slot 2 leads"
                                  : " · no result yet"}
                            {` · ${match.outcome.slot1SetWins}–${match.outcome.slot2SetWins} Set-wins`}
                          </p>
                          {match.sets.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                              No Sets. Organizer can add a shell before sides
                              exist.
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
                                        Slot 1 games
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
                                        Slot 2 games
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
                                    ) : (
                                      <p className="text-muted-foreground text-sm">
                                        Shell
                                      </p>
                                    )}
                                    {match.canScoreSets ? (
                                      <Button
                                        type="button"
                                        onClick={() => {
                                          if (
                                            scores.slot1.trim().length === 0 ||
                                            scores.slot2.trim().length === 0
                                          ) {
                                            toast.error(
                                              "Enter games won for both slots",
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
                                    {match.canAddSet ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                          removeSet.mutate({
                                            gameId: id,
                                            matchId: match.id,
                                            setId: set.id,
                                          })
                                        }
                                        disabled={removeSet.isPending}
                                      >
                                        Remove
                                      </Button>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {match.canAddSet ? (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  addSet.mutate({
                                    gameId: id,
                                    matchId: match.id,
                                  })
                                }
                                disabled={addSet.isPending}
                              >
                                Add Set
                              </Button>
                            ) : null}
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
                          {!match.bothSlotsFilled &&
                          match.status !== "completed" ? (
                            <p className="text-muted-foreground text-sm">
                              Scoring is frozen until both slots have Game
                              teams.
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </RowList>
              )}
              {data.isOrganizer &&
              !data.cancelledAt &&
              data.format === "friendly_tournament" ? (
                <Card variant="outlined">
                  <form
                    className="space-y-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (addMatch.isPending) {
                        return;
                      }
                      addMatch.mutate({
                        gameId: id,
                        startTime: parseOptionalDate(matchStart),
                        endTime: parseOptionalDate(matchEnd),
                        durationInMinutes:
                          matchDuration.trim().length === 0
                            ? null
                            : Number(matchDuration),
                        courtId: optionalSelectId(matchCourtId),
                        slot1GameTeamId: optionalSelectId(matchSlot1),
                        slot2GameTeamId: optionalSelectId(matchSlot2),
                      });
                    }}
                  >
                    <h4 className="text-title font-medium">Add Match</h4>
                    <FormErrorSummary
                      message={globalFormErrorMessage(addMatch.error)}
                    />
                    <p className="text-muted-foreground text-sm">
                      Allowed while open, full, closed, or Soft-archived. Sides
                      and Court are optional.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="match-start">Start</FieldLabel>
                        <Input
                          id="match-start"
                          type="datetime-local"
                          value={matchStart}
                          onChange={(event) =>
                            setMatchStart(event.target.value)
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="match-end">End</FieldLabel>
                        <Input
                          id="match-end"
                          type="datetime-local"
                          value={matchEnd}
                          onChange={(event) => setMatchEnd(event.target.value)}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="match-duration">
                          Duration (minutes)
                        </FieldLabel>
                        <Input
                          id="match-duration"
                          type="number"
                          min={0}
                          value={matchDuration}
                          onChange={(event) =>
                            setMatchDuration(event.target.value)
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="match-court">Court</FieldLabel>
                        <Select
                          value={matchCourtId}
                          onValueChange={setMatchCourtId}
                        >
                          <SelectTrigger id="match-court">
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
                      <Field>
                        <FieldLabel htmlFor="match-slot1">Slot 1</FieldLabel>
                        <Select
                          value={matchSlot1}
                          onValueChange={setMatchSlot1}
                        >
                          <SelectTrigger id="match-slot1">
                            <SelectValue placeholder="Slot 1" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Empty</SelectItem>
                            {data.gameTeams.map((side) => (
                              <SelectItem key={side.id} value={side.id}>
                                {gameTeamLabel(side)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="match-slot2">Slot 2</FieldLabel>
                        <Select
                          value={matchSlot2}
                          onValueChange={setMatchSlot2}
                        >
                          <SelectTrigger id="match-slot2">
                            <SelectValue placeholder="Slot 2" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Empty</SelectItem>
                            {data.gameTeams.map((side) => (
                              <SelectItem key={side.id} value={side.id}>
                                {gameTeamLabel(side)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                    <Button type="submit" disabled={addMatch.isPending}>
                      {addMatch.isPending ? "Adding…" : "Add Match"}
                    </Button>
                  </form>
                </Card>
              ) : null}
            </Section>

            <Section
              title={data.format === "americano" ? "Player pool" : "Registered"}
            >
              {data.gameTeams.length === 0 &&
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

            {(data.canRegister || data.canWaitlist) &&
            data.format === "americano" ? (
              <Card variant="outlined" className="space-y-3">
                <h3 className="text-title font-medium">
                  {data.canWaitlist ? "Join the waitlist" : "Join the pool"}
                </h3>
                <p className="text-muted-foreground text-sm">
                  Americano registration is individual. No Game team and no
                  Match this slice.
                </p>
                <Button
                  onClick={() => registerSelf.mutate({ gameId: id })}
                  disabled={registerSelf.isPending}
                >
                  {registerSelf.isPending
                    ? "Joining…"
                    : data.canWaitlist
                      ? "Join waitlist"
                      : "Register"}
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
                    registerWithPartner.mutate({
                      gameId: id,
                      partnerQuery,
                    });
                  }}
                >
                  <h3 className="text-title font-medium">
                    {data.canWaitlist
                      ? "Join waitlist with a partner"
                      : "Register with a partner"}
                  </h3>
                  <FormErrorSummary
                    message={globalFormErrorMessage(registerWithPartner.error)}
                  />
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="partner-query">Partner</FieldLabel>
                      <Input
                        id="partner-query"
                        value={partnerQuery}
                        onChange={(event) =>
                          setPartnerQuery(event.target.value)
                        }
                        required
                        aria-invalid={
                          fieldErrorMessage(
                            registerWithPartner.error,
                            "partnerQuery",
                          )
                            ? true
                            : undefined
                        }
                        aria-describedby={
                          fieldErrorMessage(
                            registerWithPartner.error,
                            "partnerQuery",
                          )
                            ? "partner-query-error"
                            : undefined
                        }
                      />
                      <FieldDescription>
                        Lookup an existing User. You both must be allowed to
                        join.
                      </FieldDescription>
                      <FieldError id="partner-query-error">
                        {fieldErrorMessage(
                          registerWithPartner.error,
                          "partnerQuery",
                        )}
                      </FieldError>
                    </Field>
                  </FieldGroup>
                  <Button
                    type="submit"
                    disabled={registerWithPartner.isPending}
                  >
                    {registerWithPartner.isPending
                      ? "Registering…"
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

            {data.isOrganizer &&
            data.registrationMode !== "team_only" &&
            !data.cancelledAt ? (
              <Card variant="outlined" className="space-y-4">
                <div>
                  <h3 className="text-title font-medium">Lookup invite</h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Existing User only. They accept on Invites. Team-only Games
                    do not offer Lookup.
                    {data.joinFrozen
                      ? " Mint is refused while the Community is Soft-archived."
                      : ""}
                  </p>
                </div>
                {data.joinFrozen ? null : (
                  <form
                    className="flex flex-wrap items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (sendLookupInvite.isPending) {
                        return;
                      }
                      sendLookupInvite.mutate({
                        gameId: id,
                        query: lookupQuery,
                      });
                    }}
                  >
                    <FormErrorSummary
                      className="w-full"
                      message={globalFormErrorMessage(sendLookupInvite.error)}
                    />
                    <Field className="min-w-56 flex-1">
                      <FieldLabel htmlFor="game-lookup-query">User</FieldLabel>
                      <Input
                        id="game-lookup-query"
                        value={lookupQuery}
                        onChange={(event) => setLookupQuery(event.target.value)}
                        required
                        aria-invalid={
                          fieldErrorMessage(sendLookupInvite.error, "query")
                            ? true
                            : undefined
                        }
                        aria-describedby={
                          fieldErrorMessage(sendLookupInvite.error, "query")
                            ? "game-lookup-query-error"
                            : undefined
                        }
                      />
                      <FieldError id="game-lookup-query-error">
                        {fieldErrorMessage(sendLookupInvite.error, "query")}
                      </FieldError>
                    </Field>
                    <Button type="submit" disabled={sendLookupInvite.isPending}>
                      {sendLookupInvite.isPending
                        ? "Sending…"
                        : "Send Lookup invite"}
                    </Button>
                  </form>
                )}
                {lookupInvites.data && lookupInvites.data.length > 0 ? (
                  <RowList>
                    {lookupInvites.data.map((invite) => (
                      <li
                        key={invite.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2"
                      >
                        <p className="text-sm">
                          {invite.user.name} ({invite.user.email})
                        </p>
                        <Button
                          variant="outline"
                          onClick={() =>
                            revokeLookupInvite.mutate({ inviteId: invite.id })
                          }
                          disabled={revokeLookupInvite.isPending}
                        >
                          Revoke
                        </Button>
                      </li>
                    ))}
                  </RowList>
                ) : null}
              </Card>
            ) : null}

            {data.isOrganizer && !data.cancelledAt && !data.joinFrozen ? (
              <Card variant="outlined" className="space-y-4">
                <div>
                  <h3 className="text-title font-medium">Invite link</h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Each copy mints a new 6-hour token. Older copied URLs stay
                    live until each expires. There is no rotate or revoke.
                    Team-only links need both partners to accept.
                  </p>
                </div>
                {inviteLink.data ? (
                  <p className="text-muted-foreground break-all text-sm">
                    Newest: {inviteLink.data.inviteUrl}
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No live Invite link. Copy to mint one.
                  </p>
                )}
                <Button
                  onClick={() => createInviteLink.mutate({ gameId: id })}
                  disabled={createInviteLink.isPending}
                >
                  {createInviteLink.isPending ? "Copying…" : "Copy Invite link"}
                </Button>
              </Card>
            ) : null}
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

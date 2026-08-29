"use client";

import Link from "next/link";
import { use } from "react";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
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

  const registerWithPartner = api.games.registerWithPartner.useMutation({
    onSuccess: async (result) => {
      toast.success(result.waitlisted ? "Joined waitlist" : "Registered");
      setPartnerQuery("");
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
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
      toast.error(error.message);
    },
  });

  const leaveGame = api.games.leave.useMutation({
    onSuccess: async () => {
      toast.success("Left Game");
      await utils.games.byId.invalidate({ id });
      await utils.users.home.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const leaveWaitlist = api.games.leaveWaitlist.useMutation({
    onSuccess: async () => {
      toast.success("Left waitlist");
      await utils.games.byId.invalidate({ id });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const data = game.data;
  const firstEligibleTeam = data?.eligibleTeams[0]?.id ?? "";

  React.useEffect(() => {
    if (firstEligibleTeam && teamId.length === 0) {
      setTeamId(firstEligibleTeam);
    }
  }, [firstEligibleTeam, teamId.length]);

  return (
    <DashboardShell title="Game">
      <div className="space-y-8">
        {game.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : null}

        {game.error ? (
          <p className="text-destructive text-sm">{game.error.message}</p>
        ) : null}

        {data ? (
          <>
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h2 className="text-foreground text-2xl font-semibold tracking-tight">
                    {data.name ?? "Untitled Game"}
                  </h2>
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
                  <Badge variant="secondary" className="capitalize">
                    {data.format.replaceAll("_", " ")}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    {data.registrationMode.replaceAll("_", " ")}
                  </Badge>
                  {data.isPublic ? (
                    <Badge variant="outline">Public</Badge>
                  ) : (
                    <Badge variant="outline">Not public</Badge>
                  )}
                  <Badge variant="outline" className="capitalize">
                    {data.registrationStatus}
                  </Badge>
                  {data.sport ? (
                    <Badge variant="secondary" className="capitalize">
                      {data.sport}
                    </Badge>
                  ) : null}
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
            </div>

            <section className="space-y-3">
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                Match
              </h3>
              {data.matches.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No Matches on this Game.
                </p>
              ) : (
                <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                  {data.matches.map((match) => (
                    <li key={match.id} className="space-y-1 px-4 py-4">
                      <p className="text-foreground font-medium">
                        {formatWhen(match.startTime)} –{" "}
                        {formatWhen(match.endTime)}
                      </p>
                      <p className="text-muted-foreground text-sm capitalize">
                        {match.status ?? "pending"}
                        {match.durationInMinutes
                          ? ` · ${match.durationInMinutes} min`
                          : ""}
                        {` · slot 1 ${match.slot1GameTeamId ? "filled" : "empty"} · slot 2 ${match.slot2GameTeamId ? "filled" : "empty"}`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                Registered
              </h3>
              {data.gameTeams.length === 0 &&
              data.registeredPlayers.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Nobody is registered yet.
                </p>
              ) : (
                <ul className="divide-border border-border bg-card divide-y rounded-xl border">
                  {data.gameTeams.map((side) => (
                    <li key={side.id} className="px-4 py-4">
                      <p className="text-foreground font-medium">
                        {side.members.length > 0
                          ? side.members
                              .map((member) => member.name)
                              .join(" / ")
                          : (side.name ?? "Game team")}
                      </p>
                    </li>
                  ))}
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
                      <li key={player.id} className="px-4 py-4">
                        <p className="text-foreground font-medium">
                          {player.name}
                        </p>
                      </li>
                    ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-foreground text-lg font-semibold tracking-tight">
                Waitlist
              </h3>
              {data.waitlist.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Waitlist is empty.
                </p>
              ) : (
                <ol className="divide-border border-border bg-card divide-y rounded-xl border">
                  {data.waitlist.map((entry, index) => (
                    <li key={entry.id} className="px-4 py-4">
                      <p className="text-foreground font-medium">
                        {index + 1}. {entry.name}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
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
            data.registrationMode === "individual" ? (
              <form
                className="border-border bg-card space-y-4 rounded-xl border p-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  registerWithPartner.mutate({
                    gameId: id,
                    partnerQuery,
                  });
                }}
              >
                <h3 className="text-foreground text-lg font-medium">
                  {data.canWaitlist
                    ? "Join waitlist with a partner"
                    : "Register with a partner"}
                </h3>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="partner-query">Partner</FieldLabel>
                    <Input
                      id="partner-query"
                      value={partnerQuery}
                      onChange={(event) => setPartnerQuery(event.target.value)}
                      placeholder="Username, email, or phone"
                      required
                    />
                    <FieldDescription>
                      Lookup an existing User. You both must be allowed to join.
                    </FieldDescription>
                  </Field>
                </FieldGroup>
                <Button type="submit" disabled={registerWithPartner.isPending}>
                  {registerWithPartner.isPending ? "Registering…" : "Register"}
                </Button>
              </form>
            ) : null}

            {(data.canRegister || data.canWaitlist) &&
            data.registrationMode === "team_only" ? (
              <form
                className="border-border bg-card space-y-4 rounded-xl border p-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (teamId.length === 0) {
                    toast.error("Pick a complete Team");
                    return;
                  }
                  registerTeam.mutate({ gameId: id, teamId });
                }}
              >
                <h3 className="text-foreground text-lg font-medium">
                  Register a Team
                </h3>
                {data.eligibleTeams.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    You need a complete Team whose both partners are allowed on
                    this Game.
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
            ) : null}
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

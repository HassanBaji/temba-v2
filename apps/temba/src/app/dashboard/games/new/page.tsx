"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { GameWindowFields } from "~/components/games/game-window-fields";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
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
import { parseRequiredGameWindow } from "~/lib/game-window";
import { api } from "~/trpc/react";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";

type RegistrationMode = "individual" | "team_only";
type GameFormat = "friendly_game" | "americano" | "friendly_tournament";

function NewGameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;

  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [format, setFormat] = React.useState<GameFormat>("friendly_game");
  const [isPublic, setIsPublic] = React.useState(false);
  const [registrationMode, setRegistrationMode] =
    React.useState<RegistrationMode>("individual");
  const [playersAllowed, setPlayersAllowed] = React.useState("8");
  const [teamsAllowed, setTeamsAllowed] = React.useState("4");
  const [day, setDay] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [finishTime, setFinishTime] = React.useState("");

  const utils = api.useUtils();
  const createGame = api.games.create.useMutation({
    onSuccess: async (game) => {
      toast.success("Game created");
      await utils.users.home.invalidate();
      await utils.games.listPublicPickup.invalidate();
      if (groupId) {
        await utils.groups.byId.invalidate({ id: groupId });
      }
      router.push(`/dashboard/games/${game.id}`);
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(
        error,
        {
          name: "game-name",
          format: "game-format",
          playersAllowed: "game-players-allowed",
          teamsAllowed: "game-teams-allowed",
          windowStart: "game-window-start",
          windowEnd: "game-window-finish",
        },
        summaryRef.current,
      );
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createGame.isPending) {
      return;
    }
    const gameWindow = parseRequiredGameWindow(day, startTime, finishTime);
    if (!gameWindow) {
      return;
    }
    createGame.mutate({
      name: name.trim().length > 0 ? name.trim() : undefined,
      groupId,
      isPublic,
      format,
      registrationMode:
        format === "americano" ? "individual" : registrationMode,
      playersAllowed:
        format === "americano" ||
        (format === "friendly_tournament" && registrationMode === "individual")
          ? Number(playersAllowed)
          : undefined,
      teamsAllowed:
        format === "friendly_tournament" && registrationMode === "team_only"
          ? Number(teamsAllowed)
          : undefined,
      windowStart: gameWindow.windowStart,
      windowEnd: gameWindow.windowEnd,
    });
  }

  return (
    <DashboardShell
      title="Create Game"
      description={
        groupId
          ? "Padel only. Friendly game creates one Match with caps 4 / 2. Americano is a player pool with no Matches. Friendly tournament starts with zero Matches; add them on Game home. This Game belongs to the Group you opened it from."
          : "Padel only. Friendly game creates one Match with caps 4 / 2. Americano is a player pool with no Matches. Friendly tournament starts with zero Matches; add them on Game home. This Game has no Group. You are the organizer."
      }
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(createGame.error)}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="game-name">Name (optional)</FieldLabel>
              <Input
                id="game-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={
                  fieldErrorMessage(createGame.error, "name") ? true : undefined
                }
                aria-describedby={
                  fieldErrorMessage(createGame.error, "name")
                    ? "game-name-error"
                    : undefined
                }
              />
              <FieldError id="game-name-error">
                {fieldErrorMessage(createGame.error, "name")}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="game-format">Format</FieldLabel>
              <Select
                value={format}
                onValueChange={(value) => {
                  const next = value as GameFormat;
                  setFormat(next);
                  if (next === "americano") {
                    setRegistrationMode("individual");
                  }
                }}
              >
                <SelectTrigger id="game-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly_game">Friendly game</SelectItem>
                  <SelectItem value="americano">Americano</SelectItem>
                  <SelectItem value="friendly_tournament">
                    Friendly tournament
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Format cannot change after create. Americano has no Matches this
                slice.
              </FieldDescription>
            </Field>

            {format === "americano" ? (
              <Field>
                <FieldLabel htmlFor="game-players-allowed">
                  Players allowed
                </FieldLabel>
                <Input
                  id="game-players-allowed"
                  type="number"
                  min={4}
                  step={4}
                  value={playersAllowed}
                  onChange={(event) => setPlayersAllowed(event.target.value)}
                />
                <FieldDescription>
                  Multiple of 4, minimum 4. Team-only is not offered.
                </FieldDescription>
                <FieldError id="game-players-allowed-error">
                  {fieldErrorMessage(createGame.error, "playersAllowed")}
                </FieldError>
              </Field>
            ) : (
              <>
                <Field>
                  <FieldLabel htmlFor="game-mode">Registration</FieldLabel>
                  <Select
                    value={registrationMode}
                    onValueChange={(value) =>
                      setRegistrationMode(value as RegistrationMode)
                    }
                  >
                    <SelectTrigger id="game-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="team_only">
                        Team-only (complete Team)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FieldDescription>
                    Format, public flag, and this mode cannot change after
                    create.
                  </FieldDescription>
                </Field>
                {format === "friendly_tournament" &&
                registrationMode === "individual" ? (
                  <Field>
                    <FieldLabel htmlFor="game-players-allowed">
                      Players allowed
                    </FieldLabel>
                    <Input
                      id="game-players-allowed"
                      type="number"
                      min={4}
                      step={4}
                      value={playersAllowed}
                      onChange={(event) =>
                        setPlayersAllowed(event.target.value)
                      }
                    />
                    <FieldDescription>
                      Multiple of 4, minimum 4.
                    </FieldDescription>
                    <FieldError id="game-players-allowed-error">
                      {fieldErrorMessage(createGame.error, "playersAllowed")}
                    </FieldError>
                  </Field>
                ) : null}
                {format === "friendly_tournament" &&
                registrationMode === "team_only" ? (
                  <Field>
                    <FieldLabel htmlFor="game-teams-allowed">
                      Teams allowed
                    </FieldLabel>
                    <Input
                      id="game-teams-allowed"
                      type="number"
                      min={2}
                      value={teamsAllowed}
                      onChange={(event) => setTeamsAllowed(event.target.value)}
                    />
                    <FieldDescription>
                      Minimum 2 complete Teams.
                    </FieldDescription>
                    <FieldError id="game-teams-allowed-error">
                      {fieldErrorMessage(createGame.error, "teamsAllowed")}
                    </FieldError>
                  </Field>
                ) : null}
              </>
            )}

            <Field>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="game-public"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked === true)}
                />
                <FieldLabel htmlFor="game-public" className="font-normal">
                  Public (anyone signed in can register)
                </FieldLabel>
              </div>
            </Field>

            <GameWindowFields
              dayId="game-window-day"
              startId="game-window-start"
              finishId="game-window-finish"
              day={day}
              startTime={startTime}
              finishTime={finishTime}
              onDayChange={setDay}
              onStartTimeChange={setStartTime}
              onFinishTimeChange={setFinishTime}
              startError={fieldErrorMessage(createGame.error, "windowStart")}
              finishError={fieldErrorMessage(createGame.error, "windowEnd")}
            />
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={createGame.isPending}>
              {createGame.isPending ? "Creating…" : "Create Game"}
            </Button>
            <Button variant="outline" asChild>
              <Link
                href={
                  groupId ? `/dashboard/groups/${groupId}` : "/dashboard/games"
                }
              >
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}

export default function NewGamePage() {
  return (
    <React.Suspense
      fallback={
        <DashboardShell title="Create Game">
          <p className="text-muted-foreground text-sm">Loading…</p>
        </DashboardShell>
      }
    >
      <NewGameForm />
    </React.Suspense>
  );
}

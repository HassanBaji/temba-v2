"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { GameWindowFields } from "~/components/games/game-window-fields";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { FieldGroup } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  formatDateInputValue,
  formatGameWindowName,
  parseRequiredGameWindow,
} from "~/lib/game-window";
import { api } from "~/trpc/react";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";

function NewGameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;

  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [day, setDay] = React.useState(() => formatDateInputValue(new Date()));
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
      name: formatGameWindowName(day, startTime, finishTime),
      groupId,
      isPublic: false,
      format: "friendly_game",
      registrationMode: "individual",
      windowStart: gameWindow.windowStart,
      windowEnd: gameWindow.windowEnd,
    });
  }

  return (
    <DashboardShell
      title="Create Game"
      description={
        groupId
          ? "Padel only. A Friendly game creates one Match with caps 4 / 2. This Game belongs to the Group you opened it from."
          : "Padel only. A Friendly game creates one Match with caps 4 / 2. This Game has no Group. You are the organizer."
      }
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(createGame.error)}
          />
          <FieldGroup>
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

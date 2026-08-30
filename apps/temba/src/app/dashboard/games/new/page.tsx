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

function venueOptionLabel(venue: {
  name: string;
  city: string;
  country: string;
}) {
  return `${venue.name} — ${venue.city}, ${venue.country}`;
}

function createVenueCopy(picker: {
  locked: boolean;
  groupKind: "club" | "loose" | "none";
  venues: { archivedAt: Date | string | null }[];
}) {
  if (picker.locked) {
    if (picker.venues[0]?.archivedAt) {
      return "This Community’s linked Venue is Soft-archived. You can still create this Game here. Skip Court.";
    }
    return "Venue is this Community’s linked Venue and cannot be changed. Court is optional.";
  }
  if (picker.groupKind === "club") {
    return "This Community has no Venue link. Pick a Venue. Court is optional.";
  }
  return "Pick a Venue. Court is optional.";
}

function NewGameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;

  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(false);
  const [registrationMode, setRegistrationMode] =
    React.useState<RegistrationMode>("individual");
  const [day, setDay] = React.useState("");
  const [startTime, setStartTime] = React.useState("");
  const [finishTime, setFinishTime] = React.useState("");
  const [venueId, setVenueId] = React.useState("");
  const [courtId, setCourtId] = React.useState("none");

  const picker = api.games.listCreateVenues.useQuery({ groupId });
  const selectedVenue = picker.data?.venues.find(
    (venue) => venue.id === venueId,
  );
  const emptyCatalog =
    picker.data !== undefined &&
    !picker.data.locked &&
    picker.data.venues.length === 0;

  const linkedVenueId = picker.data?.locked
    ? picker.data.venues[0]?.id
    : undefined;

  React.useEffect(() => {
    if (!linkedVenueId) {
      return;
    }
    setVenueId(linkedVenueId);
  }, [linkedVenueId]);

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
          venueId: "game-venue",
          courtId: "game-court",
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
    if (emptyCatalog) {
      return;
    }
    createGame.mutate({
      name: name.trim().length > 0 ? name.trim() : undefined,
      groupId,
      isPublic,
      format: "friendly_game",
      registrationMode,
      windowStart: gameWindow.windowStart,
      windowEnd: gameWindow.windowEnd,
      venueId,
      courtId: courtId === "none" ? undefined : courtId,
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
            message={
              globalFormErrorMessage(createGame.error) ??
              (emptyCatalog
                ? "No live Venues. Create is not available."
                : null) ??
              (picker.error ? picker.error.message : null)
            }
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
              <FieldLabel htmlFor="game-venue">Venue</FieldLabel>
              <Select
                value={venueId || undefined}
                onValueChange={(value) => {
                  setVenueId(value);
                  setCourtId("none");
                }}
                disabled={picker.data?.locked === true}
              >
                <SelectTrigger
                  id="game-venue"
                  aria-invalid={
                    fieldErrorMessage(createGame.error, "venueId")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(createGame.error, "venueId")
                      ? "game-venue-error"
                      : "game-venue-copy"
                  }
                >
                  <SelectValue placeholder="Select a Venue" />
                </SelectTrigger>
                <SelectContent>
                  {(picker.data?.venues ?? []).map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {venueOptionLabel(venue)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription id="game-venue-copy">
                {picker.data
                  ? createVenueCopy(picker.data)
                  : "Pick a Venue. Court is optional."}
              </FieldDescription>
              <FieldError id="game-venue-error">
                {fieldErrorMessage(createGame.error, "venueId") ??
                  (emptyCatalog
                    ? "No live Venues. Create is not available."
                    : undefined)}
              </FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="game-court">Court</FieldLabel>
              <Select value={courtId} onValueChange={setCourtId}>
                <SelectTrigger
                  id="game-court"
                  aria-invalid={
                    fieldErrorMessage(createGame.error, "courtId")
                      ? true
                      : undefined
                  }
                  aria-describedby={
                    fieldErrorMessage(createGame.error, "courtId")
                      ? "game-court-error"
                      : undefined
                  }
                >
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(selectedVenue?.courts ?? []).map((court) => (
                    <SelectItem key={court.id} value={court.id}>
                      {court.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError id="game-court-error">
                {fieldErrorMessage(createGame.error, "courtId")}
              </FieldError>
            </Field>

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
                Individual seats 4 players; Team-only seats 2 Teams. Public flag
                and this mode cannot change after create.
              </FieldDescription>
            </Field>

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
            <Button
              type="submit"
              disabled={createGame.isPending || emptyCatalog}
            >
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

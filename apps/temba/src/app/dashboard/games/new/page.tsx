"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
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
import { api } from "~/trpc/react";

type RegistrationMode = "individual" | "team_only";

function parseOptionalDate(value: string) {
  if (value.trim().length === 0) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date;
}

function NewGameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("groupId") ?? undefined;

  const [name, setName] = React.useState("");
  const [isPublic, setIsPublic] = React.useState(false);
  const [registrationMode, setRegistrationMode] =
    React.useState<RegistrationMode>("individual");
  const [windowStart, setWindowStart] = React.useState("");
  const [windowEnd, setWindowEnd] = React.useState("");

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
      toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createGame.mutate({
      name: name.trim().length > 0 ? name.trim() : undefined,
      groupId,
      isPublic,
      registrationMode,
      windowStart: parseOptionalDate(windowStart),
      windowEnd: parseOptionalDate(windowEnd),
    });
  }

  return (
    <DashboardShell title="Create Game">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Create a Friendly game
          </h2>
          <p className="text-muted-foreground text-sm">
            Padel only. Creates one Match. Caps are 4 players or 2 Teams.
            {groupId
              ? " This Game belongs to the Group you opened it from."
              : " This Game has no Group. You are the organizer."}
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="border-border bg-card space-y-6 rounded-xl border p-6"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="game-name">Name (optional)</FieldLabel>
              <Input
                id="game-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Friday night"
                maxLength={255}
              />
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
                  <SelectItem value="individual">
                    Individual (register with a partner)
                  </SelectItem>
                  <SelectItem value="team_only">
                    Team-only (complete Team)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Format, public flag, and this mode cannot change after create.
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

            <Field>
              <FieldLabel htmlFor="game-window-start">
                Window start (optional)
              </FieldLabel>
              <Input
                id="game-window-start"
                type="datetime-local"
                value={windowStart}
                onChange={(event) => setWindowStart(event.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="game-window-end">
                Window end (optional)
              </FieldLabel>
              <Input
                id="game-window-end"
                type="datetime-local"
                value={windowEnd}
                onChange={(event) => setWindowEnd(event.target.value)}
              />
              <FieldDescription>
                Set both start and end, or leave both blank.
              </FieldDescription>
            </Field>
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
      </div>
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

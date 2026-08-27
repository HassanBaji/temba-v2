"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { api } from "~/trpc/react";

export default function NewTeamPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const [name, setName] = React.useState("");

  const createTeam = api.teams.create.useMutation({
    onSuccess: async (team) => {
      toast.success("Team created");
      await utils.teams.mine.invalidate();
      router.push(`/dashboard/teams/${team.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTeam.mutate({
      name: name.trim().length > 0 ? name.trim() : undefined,
      sport: "padel",
    });
  }

  return (
    <DashboardShell title="Create Team">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Create a Team
          </h2>
          <p className="text-muted-foreground text-sm">
            Start an unattached padel partnership. You become the first member
            and can invite a partner later.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="border-border bg-card space-y-6 rounded-xl border p-6"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="team-name">Name (optional)</FieldLabel>
              <Input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Team name"
                maxLength={255}
              />
              <FieldDescription>
                If you leave this blank, the Team home uses member names.
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? "Creating…" : "Create Team"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/teams">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

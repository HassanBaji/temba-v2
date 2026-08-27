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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

type Sport = "padel" | "football";
type GroupVisibility = "public" | "private";

export default function NewLooseGroupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [sport, setSport] = React.useState<Sport>("padel");
  const [visibility, setVisibility] = React.useState<GroupVisibility>("public");

  const createLoosePublic = api.groups.createLoosePublic.useMutation({
    onSuccess: (group) => {
      toast.success("Loose Group created");
      router.push(`/dashboard/groups/${group.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createLoosePrivate = api.groups.createLoosePrivate.useMutation({
    onSuccess: (group) => {
      toast.success("Loose Group Private created");
      router.push(`/dashboard/groups/${group.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const isPending = createLoosePublic.isPending || createLoosePrivate.isPending;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (visibility === "private") {
      createLoosePrivate.mutate({ name, sport });
      return;
    }
    createLoosePublic.mutate({ name, sport });
  }

  return (
    <DashboardShell title="Create Loose Group">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Create a Loose Group
          </h2>
          <p className="text-muted-foreground text-sm">
            A squad outside any Community. Public joins via the Group URL;
            Private uses Email invites and one reusable Invite link. You become
            a Group member.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="border-border bg-card space-y-6 rounded-xl border p-6"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="group-name">Name</FieldLabel>
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Group name"
                required
                maxLength={255}
              />
            </Field>

            <Field>
              <FieldLabel>Sport</FieldLabel>
              <Select
                value={sport}
                onValueChange={(value) => setSport(value as Sport)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select sport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="padel">Padel</SelectItem>
                  <SelectItem value="football">Football</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>Exactly one sport.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={visibility}
                onValueChange={(value) =>
                  setVisibility(value as GroupVisibility)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Public (open-with-link)
                  </SelectItem>
                  <SelectItem value="private">
                    Private (Email invite + Invite link)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {visibility === "private"
                  ? "Only you can send Email invites and manage the Invite link."
                  : "Share the Group URL. Not listed in the Directory."}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create Group"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/communities">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

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

export default function NewLooseGroupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [sport, setSport] = React.useState<Sport>("padel");

  const createLoosePublic = api.groups.createLoosePublic.useMutation({
    onSuccess: (group) => {
      toast.success("Loose Group created");
      router.push(`/dashboard/groups/${group.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createLoosePublic.mutate({
      name,
      sport,
    });
  }

  return (
    <DashboardShell title="Create Loose Group">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            Create a Loose Group Public
          </h2>
          <p className="text-sm text-white/70">
            A squad outside any Community. Public means join via the Group URL —
            not listed in the Directory, and not an Invite link. You become a
            Group member.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-6 rounded-xl border border-white/10 bg-black/20 p-6"
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
              <FieldDescription>
                Exactly one sport. Type is Public (open-with-link).
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={createLoosePublic.isPending}>
              {createLoosePublic.isPending ? "Creating…" : "Create Group"}
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

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

type CommunityType = "public" | "private";

export default function NewCommunityPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CommunityType>("public");

  const createCommunity = api.communities.create.useMutation({
    onSuccess: async (community) => {
      toast.success("Community created");
      await utils.communities.mine.invalidate();
      router.push(`/dashboard/communities/${community.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCommunity.mutate({
      name,
      type,
      sports: ["padel"],
    });
  }

  return (
    <DashboardShell title="Create Community">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-1">
          <h2 className="text-foreground text-2xl font-semibold tracking-tight">
            Create a Community
          </h2>
          <p className="text-muted-foreground text-sm">
            You become the Owner. Groups are optional.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="border-border bg-card space-y-6 rounded-xl border p-6"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="community-name">Name</FieldLabel>
              <Input
                id="community-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Club name"
                required
                maxLength={255}
              />
            </Field>

            <Field>
              <FieldLabel>Type</FieldLabel>
              <Select
                value={type}
                onValueChange={(value) => setType(value as CommunityType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Public (join by request via URL)
                  </SelectItem>
                  <SelectItem value="private">
                    Private (Email invite + Invite link)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {type === "private"
                  ? "Invite-only: Email invite and Invite link."
                  : "Joinable by request via the Community URL. Not listed in the App today."}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={createCommunity.isPending}>
              {createCommunity.isPending ? "Creating…" : "Create Community"}
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

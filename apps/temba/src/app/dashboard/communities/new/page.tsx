"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  FieldLegend,
  FieldSet,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/trpc/react";

type CommunityType = "public" | "private";
type Sport = "padel" | "football";

export default function NewCommunityPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CommunityType>("public");
  const [sports, setSports] = React.useState<Sport[]>([]);

  const createCommunity = api.communities.create.useMutation({
    onSuccess: (community) => {
      toast.success("Community created");
      router.push(`/dashboard/communities/${community.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  function toggleSport(sport: Sport, checked: boolean) {
    setSports((current) => {
      if (checked) {
        return current.includes(sport) ? current : [...current, sport];
      }
      return current.filter((value) => value !== sport);
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCommunity.mutate({
      name,
      type,
      sports,
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
            Start a club with at least one sport. You become the Owner. Groups
            are optional.
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
                    Public (listed in Directory)
                  </SelectItem>
                  <SelectItem value="private">Private (invite-only)</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Public clubs appear in the Directory. Private clubs do not.
              </FieldDescription>
            </Field>

            <FieldSet>
              <FieldLegend variant="label">Sports</FieldLegend>
              <FieldDescription>
                Choose padel, football, or both. At least one is required.
              </FieldDescription>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sport-padel"
                    checked={sports.includes("padel")}
                    onCheckedChange={(checked) =>
                      toggleSport("padel", checked === true)
                    }
                  />
                  <Label htmlFor="sport-padel">Padel</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="sport-football"
                    checked={sports.includes("football")}
                    onCheckedChange={(checked) =>
                      toggleSport("football", checked === true)
                    }
                  />
                  <Label htmlFor="sport-football">Football</Label>
                </div>
              </div>
            </FieldSet>
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={createCommunity.isPending}>
              {createCommunity.isPending ? "Creating…" : "Create Community"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/directory">Cancel</Link>
            </Button>
          </div>
        </form>
      </div>
    </DashboardShell>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { api, type RouterInputs } from "~/trpc/react";

type CommunityType = RouterInputs["communities"]["create"]["type"];

const FIELD_IDS = { name: "community-name", type: "community-type" };

export default function NewCommunityPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CommunityType>("public");

  const createCommunity = api.communities.create.useMutation({
    onSuccess: async (community) => {
      toast.success("Community created");
      await utils.communities.mine.invalidate();
      router.push(`/dashboard/communities/${community.id}`);
    },
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });

  const nameError = fieldErrorMessage(createCommunity.error, "name");

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createCommunity.isPending) {
      return;
    }
    createCommunity.mutate({
      name,
      type,
      sports: ["padel"],
    });
  }

  return (
    <DashboardShell
      title="Create Community"
      description="You become the Owner. Groups are optional."
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(createCommunity.error)}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="community-name">Name</FieldLabel>
              <Input
                id="community-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={255}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={
                  nameError ? "community-name-error" : undefined
                }
              />
              <FieldError id="community-name-error">{nameError}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="community-type">Type</FieldLabel>
              <Select
                value={type}
                onValueChange={(value) => setType(value as CommunityType)}
              >
                <SelectTrigger id="community-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Public (ask to join with the link)
                  </SelectItem>
                  <SelectItem value="private">Private (invite only)</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {type === "private"
                  ? "Only people you invite can join."
                  : "People with the Community link ask to join. It isn't listed anywhere yet."}
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
      </Card>
    </DashboardShell>
  );
}

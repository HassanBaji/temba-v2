"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import {
  COMMUNITY_CREATED_TOAST,
  COMMUNITY_CREATE_COPY,
  COMMUNITY_TYPE_LABELS,
  communityTypeHelp,
} from "@repo/domain/community";
import { api, type RouterInputs } from "~/trpc/react";

type CommunityType = RouterInputs["communities"]["create"]["type"];

const FIELD_IDS = { name: "community-name", type: "community-type" };

const TYPE_OPTIONS: { value: CommunityType; label: string }[] = [
  { value: "public", label: COMMUNITY_TYPE_LABELS.public },
  { value: "private", label: COMMUNITY_TYPE_LABELS.private },
];

export default function NewCommunityPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CommunityType>("public");

  const createCommunity = api.communities.create.useMutation({
    onSuccess: async (community) => {
      toast.success(COMMUNITY_CREATED_TOAST);
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
      title={COMMUNITY_CREATE_COPY.title}
      description={COMMUNITY_CREATE_COPY.description}
    >
      <section className="border-rule rounded-[14px] border p-5">
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
              <FieldTitle id="community-type-label">Type</FieldTitle>
              <RovingRadioGroup
                id="community-type"
                aria-labelledby="community-type-label"
                aria-describedby="community-type-description"
                className="grid grid-cols-2 gap-2"
              >
                {TYPE_OPTIONS.map((option) => (
                  <ChoiceChip
                    key={option.value}
                    role="radio"
                    selected={type === option.value}
                    onClick={() => setType(option.value)}
                  >
                    {option.label}
                  </ChoiceChip>
                ))}
              </RovingRadioGroup>
              <FieldDescription id="community-type-description">
                {communityTypeHelp(type)}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={createCommunity.isPending}
              className="bg-ink text-paper hover:bg-dimrule h-[46px] w-full rounded-[12px] font-semibold"
            >
              {createCommunity.isPending
                ? "Creating…"
                : COMMUNITY_CREATE_COPY.submit}
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-[46px] w-full rounded-[12px]"
            >
              <Link href="/dashboard/communities">Cancel</Link>
            </Button>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}

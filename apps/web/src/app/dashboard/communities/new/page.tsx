"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
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
import { SportCheckboxes } from "~/components/temba/sport-picker";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import { communityTypeHelp } from "@repo/domain/community";
import { toggleCommunitySport } from "@repo/domain/community-sports";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import { api, type RouterInputs } from "~/trpc/react";

type CommunityType = RouterInputs["communities"]["create"]["type"];

const FIELD_IDS = { name: "community-name", type: "community-type" };

const TYPE_VALUES: CommunityType[] = ["public", "private"];

export default function NewCommunityPage() {
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<CommunityType>("public");
  const [sports, setSports] = React.useState<Sport[]>([DEFAULT_SPORT]);

  const createCommunity = api.communities.create.useMutation({
    onSuccess: async (community) => {
      toast.success(m.community.toast.created);
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
    if (createCommunity.isPending || sports.length === 0) {
      return;
    }
    createCommunity.mutate({
      name,
      type,
      sports,
    });
  }

  return (
    <DashboardShell
      title={m.community.create.title}
      description={m.community.create.description}
    >
      <section className="border-rule rounded-[14px] border p-5">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(createCommunity.error)}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="community-name">
                {m.webDashboard.communities.new.name}
              </FieldLabel>
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
              <FieldTitle id="community-type-label">
                {m.webDashboard.communities.new.type}
              </FieldTitle>
              <RovingRadioGroup
                id="community-type"
                aria-labelledby="community-type-label"
                aria-describedby="community-type-description"
                className="grid grid-cols-2 gap-2"
              >
                {TYPE_VALUES.map((value) => (
                  <ChoiceChip
                    key={value}
                    role="radio"
                    selected={type === value}
                    onClick={() => setType(value)}
                  >
                    {m.community.type[value]}
                  </ChoiceChip>
                ))}
              </RovingRadioGroup>
              <FieldDescription id="community-type-description">
                {communityTypeHelp(type, locale)}
              </FieldDescription>
            </Field>

            <Field>
              <FieldTitle id="community-sports-label">
                {m.community.sports.createLabel}
              </FieldTitle>
              <SportCheckboxes
                id="community-sports"
                labelledBy="community-sports-label"
                value={sports}
                onToggle={(sport) =>
                  setSports((current) => toggleCommunitySport(current, sport))
                }
                disabled={createCommunity.isPending}
              />
              <FieldDescription>
                {m.community.sports.createHelp}
              </FieldDescription>
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              disabled={createCommunity.isPending || sports.length === 0}
              className="bg-ink text-paper hover:bg-dimrule h-[46px] w-full rounded-[12px] font-semibold"
            >
              {createCommunity.isPending
                ? m.webDashboard.creating
                : m.community.create.submit}
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-[46px] w-full rounded-[12px]"
            >
              <Link href="/dashboard/communities">{m.common.cancel}</Link>
            </Button>
          </div>
        </form>
      </section>
    </DashboardShell>
  );
}

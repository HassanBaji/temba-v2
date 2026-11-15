"use client";

import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";

import { ErrorState } from "~/components/common/error-state";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { SectionTitle } from "~/components/home/section-title";
import { useLocale, useMessages } from "~/components/locale-provider";
import { useRequestAnswers } from "~/components/requests/request-answers-provider";
import {
  RequestList,
  RequestRowItem,
  RequestsFootnote,
} from "~/components/requests/request-card";
import { Button } from "~/components/ui/button";
import { SelectCard } from "~/components/ui/select-card";
import { Skeleton } from "~/components/ui/skeleton";
import { playerProfilePath } from "~/lib/dashboard-paths";
import {
  groupJoinPolicyLine,
  groupJoinRequestsSummary,
  groupWhoCanJoinDescription,
} from "@repo/domain/group-admin";
import {
  waitingCountLabel,
  type WaitingRequest,
} from "@repo/domain/waiting-requests";
import {
  groupRequestRows,
  waitingRequestsOf,
} from "@repo/domain/request-answers";

function ChangePolicyButton({ onClick }: { onClick: () => void }) {
  const m = useMessages();
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={onClick}
      aria-label={m.webGroup.requests.changePolicyAria}
      className="text-eyebrow text-ink shrink-0 px-1.5"
    >
      {m.group.admin.changeLabel}
    </Button>
  );
}

/** Design 3b: requests to join sit above the members, on the same card as everywhere. */
export function GroupJoinRequests({
  groupId,
  requiresApproval,
  linkToProfiles,
  onBlock,
  onChangePolicy,
}: {
  groupId: string;
  requiresApproval: boolean;
  linkToProfiles: boolean;
  onBlock: (request: WaitingRequest) => void;
  onChangePolicy: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const { rows: allRows, isLoading, error, refetch } = useRequestAnswers();
  if (isLoading) {
    return <Skeleton className="rounded-card h-16 w-full" />;
  }
  if (error) {
    return (
      <ErrorState
        headingLevel={3}
        title={m.group.admin.requestsErrorTitle}
        message={error.message}
        onRetry={refetch}
      />
    );
  }
  const rows = groupRequestRows(allRows, groupId);
  if (rows.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-3">
      <SectionTitle
        title={m.requests.title}
        meta={waitingCountLabel(waitingRequestsOf(rows).length, locale)}
      />
      <RequestList>
        {rows.map((row) => (
          <RequestRowItem
            key={row.request.id}
            row={row}
            nameHref={
              linkToProfiles
                ? playerProfilePath(row.request.user.id)
                : undefined
            }
            extra={
              <Button
                type="button"
                variant="link"
                size="sm"
                className="text-eyebrow text-muted-foreground self-start px-0"
                onClick={() => onBlock(row.request)}
              >
                {m.group.admin.reject.blockLabel}
              </Button>
            }
          />
        ))}
        <div className="bg-wash flex items-center justify-between gap-3 py-1.5 pe-2.5 ps-4">
          <span className="text-eyebrow text-muted-foreground">
            {groupJoinPolicyLine(requiresApproval, locale)}
          </span>
          <ChangePolicyButton onClick={onChangePolicy} />
        </div>
      </RequestList>
      <RequestsFootnote>{m.requests.groupNote}</RequestsFootnote>
    </section>
  );
}

/** The one-line card that stands in for the requests while none waits. */
export function GroupJoinPolicySummary({
  groupId,
  requiresApproval,
  approvedToday,
  onChangePolicy,
}: {
  groupId: string;
  requiresApproval: boolean;
  approvedToday: number;
  onChangePolicy: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const { rows, isLoading, error } = useRequestAnswers();
  if (isLoading || error || groupRequestRows(rows, groupId).length > 0) {
    return null;
  }
  const summary = groupJoinRequestsSummary({
    requiresApproval,
    approvedToday,
    locale,
  });
  return (
    <section
      aria-label={m.webGroup.requests.title}
      className="border-rule rounded-card hatch flex items-center gap-3 border py-3 pe-2.5 ps-[18px]"
    >
      <Inbox
        aria-hidden="true"
        className="text-muted-foreground size-4 shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="text-meta block font-semibold">{summary.title}</span>
        <span className="text-eyebrow text-muted-foreground block">
          {summary.line}
        </span>
      </span>
      <ChangePolicyButton onClick={onChangePolicy} />
    </section>
  );
}

export function WhoCanJoinDialog({
  open,
  onOpenChange,
  requiresApproval,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiresApproval: boolean;
  pending: boolean;
  onSave: (requiresApproval: boolean) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const whoCanJoin = m.group.admin.whoCanJoin;
  const [choice, setChoice] = useState(requiresApproval);

  useEffect(() => {
    if (open) {
      setChoice(requiresApproval);
    }
  }, [open, requiresApproval]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{whoCanJoin.title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {groupWhoCanJoinDescription(locale)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div
          role="radiogroup"
          aria-label={whoCanJoin.title}
          className="mx-4 flex flex-col gap-2 md:mx-0"
        >
          <SelectCard
            role="radio"
            selected={choice}
            trailing="check"
            title={whoCanJoin.approve.title}
            description={whoCanJoin.approve.description}
            disabled={pending}
            onClick={() => setChoice(true)}
          />
          <SelectCard
            role="radio"
            selected={!choice}
            trailing="check"
            title={whoCanJoin.open.title}
            description={whoCanJoin.open.description}
            disabled={pending}
            onClick={() => setChoice(false)}
          />
        </div>
        <ResponsiveDialogFooter>
          <Button
            type="button"
            size="lg"
            pending={pending}
            onClick={() =>
              choice === requiresApproval ? onOpenChange(false) : onSave(choice)
            }
            className="w-full font-semibold"
          >
            {m.common.done}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

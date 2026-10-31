"use client";

import { forwardRef, useEffect, useState } from "react";
import { ArrowDown, Check, ChevronRight, Inbox } from "lucide-react";
import Link from "next/link";

import { ErrorState } from "~/components/common/error-state";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { UserAvatar } from "~/components/common/user-avatar";
import { Button } from "~/components/ui/button";
import { SelectCard } from "~/components/ui/select-card";
import { Skeleton } from "~/components/ui/skeleton";
import { Surface } from "~/components/ui/surface";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { cn } from "~/lib/utils";
import {
  GROUP_JOIN_POLICY_CHANGE_LABEL,
  GROUP_JOIN_REQUESTS_REVIEW_LABEL,
  GROUP_REQUESTS_ERROR_TITLE,
  GROUP_WHO_CAN_JOIN,
  groupJoinPolicyLine,
  groupJoinRequestMeta,
  groupJoinRequestsBannerText,
  groupJoinRequestsHeading,
  groupJoinRequestsSummary,
  groupRejectRequestCopy,
  groupWhoCanJoinDescription,
} from "@repo/domain/group-admin";
import { levelCellView } from "@repo/domain/group-home-chrome";
import { type RouterOutputs } from "~/trpc/react";

export type JoinRequest = RouterOutputs["groups"]["listJoinRequests"][number];

export function JoinRequestsBanner({
  count,
  onReview,
}: {
  count: number;
  onReview: () => void;
}) {
  if (count === 0) {
    return null;
  }
  return (
    <Surface
      tone="ink"
      radius="card"
      className="flex items-center gap-2.5 py-2 pl-4 pr-2"
    >
      <span aria-hidden="true" className="bg-paper size-1.5 rounded-full" />
      <span className="text-meta flex-1 font-semibold">
        {groupJoinRequestsBannerText(count)}
      </span>
      <Button
        type="button"
        variant="outline-inverse"
        size="sm"
        onClick={onReview}
        aria-label="Review join requests"
      >
        {GROUP_JOIN_REQUESTS_REVIEW_LABEL}
        <ArrowDown aria-hidden="true" />
      </Button>
    </Surface>
  );
}

function LevelChip({ level }: { level: JoinRequest["level"] }) {
  const view = levelCellView(level?.levelBand, level?.provisional ?? true);
  if (!view.label) {
    return null;
  }
  return (
    <span
      className={cn(
        "border-ink rounded-xs text-eyebrow shrink-0 border px-1 font-mono",
        view.kind === "provisional" && "hatch",
      )}
      aria-label={
        view.kind === "provisional"
          ? `Level ${view.label}, still Provisional`
          : `Level ${view.label}`
      }
    >
      {view.label}
    </span>
  );
}

function ChangePolicyButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={onClick}
      aria-label="Change who can join"
      className="text-eyebrow text-ink shrink-0 px-1.5"
    >
      {GROUP_JOIN_POLICY_CHANGE_LABEL}
    </Button>
  );
}

function RequestItem({
  request,
  communityName,
  showLevel,
  linkToProfile,
  approving,
  rejecting,
  onApprove,
  onReject,
}: {
  request: JoinRequest;
  communityName: string | null;
  showLevel: boolean;
  linkToProfile: boolean;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const name = request.user.name ?? "User";
  const meta = groupJoinRequestMeta(request, communityName);
  const identity = (
    <>
      <UserAvatar name={name} image={request.user.image} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-[7px]">
          <span className="text-body truncate font-semibold">{name}</span>
          {showLevel ? <LevelChip level={request.level} /> : null}
        </span>
        <span className="text-eyebrow text-muted-foreground truncate">
          {meta}
        </span>
      </span>
    </>
  );
  return (
    <li className="border-rule flex flex-col gap-3 border-t p-4 first:border-t-0">
      {linkToProfile ? (
        <Link
          href={playerProfilePath(request.user.id)}
          className="flex items-center gap-3 rounded-md outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-current"
        >
          {identity}
          <ChevronRight
            aria-hidden="true"
            className="text-muted-foreground size-[18px] shrink-0"
          />
        </Link>
      ) : (
        <div className="flex items-center gap-3">{identity}</div>
      )}
      {request.note ? (
        <p className="bg-wash text-meta rounded-md px-3 py-2.5">
          {`“${request.note}”`}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={onApprove}
          pending={approving}
          disabled={rejecting}
          aria-label={`Approve ${name}`}
          className="flex-1 font-semibold"
        >
          <Check aria-hidden="true" />
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onReject}
          pending={rejecting}
          disabled={approving}
          aria-label={`Reject ${name}`}
        >
          Reject
        </Button>
      </div>
    </li>
  );
}

/** Sits under the members table; the banner above it scrolls here. */
export const JoinRequestsCard = forwardRef<
  HTMLElement,
  {
    requests: JoinRequest[] | undefined;
    loading: boolean;
    error?: string;
    onRetry: () => void;
    requiresApproval: boolean;
    approvedToday: number;
    communityName: string | null;
    showLevel: boolean;
    linkToProfiles: boolean;
    approvePendingId?: string;
    rejectPendingId?: string;
    onApprove: (request: JoinRequest) => void;
    onAskReject: (request: JoinRequest) => void;
    onChangePolicy: () => void;
  }
>(function JoinRequestsCard(props, ref) {
  if (props.loading) {
    return <Skeleton className="rounded-card h-16 w-full" />;
  }
  if (props.error) {
    return (
      <ErrorState
        headingLevel={3}
        title={GROUP_REQUESTS_ERROR_TITLE}
        message={props.error}
        onRetry={props.onRetry}
      />
    );
  }
  const requests = props.requests ?? [];

  if (requests.length === 0) {
    const summary = groupJoinRequestsSummary({
      requiresApproval: props.requiresApproval,
      approvedToday: props.approvedToday,
    });
    return (
      <section
        ref={ref}
        aria-label="Join requests"
        className="border-rule rounded-card hatch flex items-center gap-3 border py-3 pl-[18px] pr-2.5"
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
        <ChangePolicyButton onClick={props.onChangePolicy} />
      </section>
    );
  }

  const heading = groupJoinRequestsHeading(requests.length);
  return (
    <section
      ref={ref}
      aria-label={heading}
      tabIndex={-1}
      className="border-ink rounded-card overflow-hidden border outline-none"
    >
      <h2 className="bg-ink text-paper text-meta flex h-10 items-center gap-2 px-4 font-semibold">
        <Inbox aria-hidden="true" className="size-[15px]" />
        {heading}
      </h2>
      <ul>
        {requests.map((request) => (
          <RequestItem
            key={request.id}
            request={request}
            communityName={props.communityName}
            showLevel={props.showLevel}
            linkToProfile={props.linkToProfiles}
            approving={props.approvePendingId === request.id}
            rejecting={props.rejectPendingId === request.id}
            onApprove={() => props.onApprove(request)}
            onReject={() => props.onAskReject(request)}
          />
        ))}
      </ul>
      <div className="border-rule bg-wash flex items-center justify-between gap-3 border-t py-1.5 pl-4 pr-2.5">
        <span className="text-eyebrow text-muted-foreground">
          {groupJoinPolicyLine(props.requiresApproval)}
        </span>
        <ChangePolicyButton onClick={props.onChangePolicy} />
      </div>
    </section>
  );
});

export function RejectRequestDialog({
  request,
  communityName,
  pending,
  onReject,
  onOpenChange,
}: {
  request: JoinRequest | null;
  communityName: string | null;
  pending: "reject" | "block" | null;
  onReject: (block: boolean) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const name = request?.user.name ?? "User";
  const copy = groupRejectRequestCopy(name);
  return (
    <ResponsiveDialog open={request != null} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <div className="flex items-center gap-3 text-left">
            <UserAvatar
              name={name}
              image={request?.user.image ?? null}
              size="lg"
            />
            <div className="min-w-0">
              <ResponsiveDialogTitle>{copy.title}</ResponsiveDialogTitle>
              {request ? (
                <p className="text-meta text-muted-foreground">
                  {groupJoinRequestMeta(request, communityName)}
                </p>
              ) : null}
            </div>
          </div>
          <ResponsiveDialogDescription className="text-left">
            {copy.description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            variant="outline"
            pending={pending === "reject"}
            disabled={pending != null}
            onClick={() => onReject(false)}
            className="w-full justify-start font-semibold"
          >
            {copy.rejectLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            pending={pending === "block"}
            disabled={pending != null}
            onClick={() => onReject(true)}
            className="w-full justify-start font-semibold"
          >
            {copy.blockLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending != null}
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            {copy.cancelLabel}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function WhoCanJoinDialog({
  open,
  onOpenChange,
  requiresApproval,
  communityName,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiresApproval: boolean;
  communityName: string | null;
  pending: boolean;
  onSave: (requiresApproval: boolean) => void;
}) {
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
          <ResponsiveDialogTitle>
            {GROUP_WHO_CAN_JOIN.title}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {groupWhoCanJoinDescription(communityName)}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div
          role="radiogroup"
          aria-label={GROUP_WHO_CAN_JOIN.title}
          className="mx-4 flex flex-col gap-2 md:mx-0"
        >
          <SelectCard
            role="radio"
            selected={choice}
            trailing="check"
            title={GROUP_WHO_CAN_JOIN.approve.title}
            description={GROUP_WHO_CAN_JOIN.approve.description}
            disabled={pending}
            onClick={() => setChoice(true)}
          />
          <SelectCard
            role="radio"
            selected={!choice}
            trailing="check"
            title={GROUP_WHO_CAN_JOIN.open.title}
            description={GROUP_WHO_CAN_JOIN.open.description}
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
            {GROUP_WHO_CAN_JOIN.doneLabel}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

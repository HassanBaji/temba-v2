"use client";

import { Inbox } from "lucide-react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { RequestRow } from "~/components/invites/request-row";
import { Section } from "~/components/layout/section";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "~/components/ui/field";
import { Skeleton } from "~/components/ui/skeleton";
import {
  GROUP_REQUIRE_APPROVAL_HELP,
  GROUP_REQUIRE_APPROVAL_LABEL,
  GROUP_REQUESTS_DESCRIPTION,
  GROUP_REQUESTS_EMPTY,
  GROUP_REQUESTS_ERROR_TITLE,
  GROUP_REQUESTS_TITLE,
  groupJoinRequestMeta,
} from "@repo/domain/group-admin";
import { type RouterOutputs } from "~/trpc/react";

type JoinRequest = RouterOutputs["groups"]["listJoinRequests"][number];

export function GroupApproverControls({
  canSetRequiresApproval,
  requiresApproval,
  requiresApprovalPending,
  onRequiresApprovalChange,
  canDecideJoinRequests,
  joinRequests,
  joinLoading,
  joinError,
  onRetryJoin,
  approvePendingId,
  rejectPendingId,
  onApprove,
  onReject,
  communityName,
}: {
  canSetRequiresApproval: boolean;
  requiresApproval: boolean;
  requiresApprovalPending: boolean;
  onRequiresApprovalChange: (next: boolean) => void;
  canDecideJoinRequests: boolean;
  joinRequests: JoinRequest[] | undefined;
  joinLoading: boolean;
  joinError?: string;
  onRetryJoin: () => void;
  approvePendingId?: string;
  rejectPendingId?: string;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
  communityName: string | null;
}) {
  if (!canSetRequiresApproval && !canDecideJoinRequests) {
    return null;
  }

  const empty =
    canDecideJoinRequests &&
    !joinLoading &&
    !joinError &&
    joinRequests?.length === 0;

  return (
    <div className="flex flex-col gap-[26px]">
      {canSetRequiresApproval ? (
        <Field>
          <div className="flex items-center gap-3">
            <Checkbox
              id="group-requires-approval"
              checked={requiresApproval}
              disabled={requiresApprovalPending}
              onCheckedChange={(checked) =>
                onRequiresApprovalChange(checked === true)
              }
            />
            <FieldLabel htmlFor="group-requires-approval">
              {GROUP_REQUIRE_APPROVAL_LABEL}
            </FieldLabel>
          </div>
          <FieldDescription>{GROUP_REQUIRE_APPROVAL_HELP}</FieldDescription>
        </Field>
      ) : null}

      {canDecideJoinRequests ? (
        <Section
          title={GROUP_REQUESTS_TITLE}
          description={GROUP_REQUESTS_DESCRIPTION}
        >
          {joinLoading ? <Skeleton className="h-16 w-full" /> : null}
          {joinError ? (
            <ErrorState
              headingLevel={3}
              title={GROUP_REQUESTS_ERROR_TITLE}
              message={joinError}
              onRetry={onRetryJoin}
            />
          ) : null}
          {joinRequests && joinRequests.length > 0 ? (
            <RowList>
              {joinRequests.map((request) => {
                const name = request.user.name ?? "User";
                return (
                  <RequestRow
                    key={request.id}
                    leading={
                      <UserAvatar
                        name={name}
                        image={request.user.image}
                        size="lg"
                      />
                    }
                    title={name}
                    meta={groupJoinRequestMeta(request, communityName)}
                    approvePending={approvePendingId === request.id}
                    rejectPending={rejectPendingId === request.id}
                    onApprove={() => onApprove(request.id)}
                    onReject={() => onReject(request.id)}
                  />
                );
              })}
            </RowList>
          ) : null}
          {empty ? (
            <EmptyState
              headingLevel={3}
              icon={Inbox}
              title={GROUP_REQUESTS_EMPTY.title}
              description={GROUP_REQUESTS_EMPTY.description}
            />
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}

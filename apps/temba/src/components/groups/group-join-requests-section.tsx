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
import { type RouterOutputs } from "~/trpc/react";

type JoinRequest = RouterOutputs["groups"]["listJoinRequests"][number];

function formatRequestedAt(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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
              Require approval
            </FieldLabel>
          </div>
          <FieldDescription>
            When on, people request to join and you decide on this tab. Turning
            it off does not admit pending requests.
          </FieldDescription>
        </Field>
      ) : null}

      {canDecideJoinRequests ? (
        <Section
          title="Requests"
          description="Approve to admit as a Group member, reject to refuse (they may re-request), or leave pending."
        >
          {joinLoading ? <Skeleton className="h-16 w-full" /> : null}
          {joinError ? (
            <ErrorState
              title="Join requests could not be loaded"
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
                    meta={`Requested ${formatRequestedAt(request.createdAt)}`}
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
              icon={Inbox}
              title="No pending requests"
              description="Group join requests will show up here."
            />
          ) : null}
        </Section>
      ) : null}
    </div>
  );
}

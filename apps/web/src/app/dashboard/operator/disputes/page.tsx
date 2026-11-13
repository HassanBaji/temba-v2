"use client";

import { gameDisplayName } from "@repo/domain/game-custom-name";
import { formatNotificationTime } from "@repo/domain/notification-copy";
import { Flag } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { ListPageSkeleton } from "~/components/common/page-skeleton";
import { RowList } from "~/components/common/row-list";
import { UserAvatar } from "~/components/common/user-avatar";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { gameHomeHref } from "~/lib/dashboard-paths";
import { invalidateRatingReads } from "~/trpc/invalidate-rating-reads";
import { api, type RouterOutputs } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

type Dispute =
  RouterOutputs["games"]["listDisputesForOperator"]["items"][number];

type Decision = { dispute: Dispute; upheld: boolean };

export default function OperatorDisputesPage() {
  const m = useMessages();
  const locale = useLocale();
  const o = m.rating.dispute.operator;
  const utils = api.useUtils();
  const [decision, setDecision] = React.useState<Decision | null>(null);

  const disputes = api.games.listDisputesForOperator.useQuery();
  const decide = api.games.decideDispute.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async (result) => {
      toast.success(result.status === "upheld" ? o.upheld : o.dismissed);
      await Promise.all([
        utils.games.listDisputesForOperator.invalidate(),
        invalidateRatingReads(utils),
      ]);
    },
  });
  const rows = disputes.data?.items ?? [];

  return (
    <DashboardShell title={o.title} description={o.description}>
      <div className="space-y-4">
        {disputes.isLoading ? <ListPageSkeleton rows={4} /> : null}

        {disputes.error ? (
          <ErrorState
            title={o.errorTitle}
            error={disputes.error}
            onRetry={() => {
              void disputes.refetch();
            }}
          />
        ) : null}

        {disputes.data && rows.length === 0 ? (
          <EmptyState
            icon={Flag}
            title={o.empty.title}
            description={o.empty.description}
          />
        ) : null}

        {rows.length > 0 ? (
          <RowList>
            {rows.map((dispute) => {
              const reason = dispute.match.completed
                ? dispute.cannotReverseReason
                : o.notCompleted;
              return (
                <li key={dispute.id} className="space-y-3 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <UserAvatar
                      name={dispute.raisedBy.name}
                      image={dispute.raisedBy.image}
                      className="size-10 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-body truncate font-semibold">
                        {gameDisplayName(dispute.game, locale)}
                      </p>
                      <p className="text-muted-foreground text-meta">
                        {o.raisedBy(
                          dispute.raisedBy.name,
                          formatNotificationTime(dispute.createdAt, locale),
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-body whitespace-pre-line break-words">
                    <bdi>{dispute.note}</bdi>
                  </p>
                  {reason ? (
                    <p className="text-muted-foreground text-meta">{reason}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={reason != null}
                      onClick={() => {
                        decide.reset();
                        setDecision({ dispute, upheld: true });
                      }}
                    >
                      {o.uphold}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        decide.reset();
                        setDecision({ dispute, upheld: false });
                      }}
                    >
                      {o.dismiss}
                    </Button>
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={gameHomeHref(dispute.game.id)}>
                        {o.openGame}
                      </Link>
                    </Button>
                  </div>
                </li>
              );
            })}
          </RowList>
        ) : null}
      </div>

      <ConfirmDialog
        open={decision !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDecision(null);
          }
        }}
        title={decision?.upheld ? o.upholdTitle : o.dismissTitle}
        description={
          decision?.upheld ? o.upholdDescription : o.dismissDescription
        }
        confirmLabel={decision?.upheld ? o.uphold : o.dismiss}
        variant={decision?.upheld ? "destructive" : "default"}
        pending={decide.isPending}
        onConfirm={async () => {
          if (!decision) {
            return;
          }
          await decide.mutateAsync({
            disputeId: decision.dispute.id,
            upheld: decision.upheld,
          });
        }}
      />
    </DashboardShell>
  );
}

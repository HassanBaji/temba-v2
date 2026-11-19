"use client";

import { operatorLevelDisputeLines } from "@repo/domain/level-dispute";
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
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { playerProfilePath } from "~/lib/dashboard-paths";
import { invalidateRatingReads } from "~/trpc/invalidate-rating-reads";
import { api, type RouterOutputs } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

type LevelDispute =
  RouterOutputs["ratings"]["listLevelDisputesForOperator"]["items"][number];

type Decision = { dispute: LevelDispute; upheld: boolean };

/** Open Level disputes for an Operator to uphold or dismiss. */
export function LevelDisputesSection() {
  const m = useMessages();
  const locale = useLocale();
  const o = m.rating.levelDispute.operator;
  const utils = api.useUtils();
  // The last decision stays set while the dialog closes, so its copy does not
  // flip to the other choice mid-animation.
  const [decision, setDecision] = React.useState<Decision | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  const disputes = api.ratings.listLevelDisputesForOperator.useQuery();
  const decide = api.ratings.decideLevelDispute.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async (result) => {
      toast.success(result.status === "upheld" ? o.upheld : o.dismissed);
      await Promise.all([
        utils.ratings.listLevelDisputesForOperator.invalidate(),
        invalidateRatingReads(utils),
      ]);
    },
  });
  const rows = disputes.data?.items ?? [];

  return (
    <section aria-labelledby="level-disputes" className="space-y-4">
      <div className="space-y-1">
        <h2 id="level-disputes" className="text-body font-semibold">
          {o.title}
        </h2>
        <p className="text-muted-foreground text-meta">{o.description}</p>
      </div>

      {disputes.isLoading ? <ListPageSkeleton rows={2} /> : null}

      {disputes.error ? (
        <ErrorState
          title={m.rating.dispute.operator.errorTitle}
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
            const lines = operatorLevelDisputeLines(dispute.override, locale);
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
                      {lines.change}
                    </p>
                    <p className="text-muted-foreground text-meta">
                      {m.rating.dispute.operator.raisedBy(
                        dispute.raisedBy.name,
                        formatNotificationTime(dispute.createdAt, locale),
                      )}
                    </p>
                  </div>
                </div>
                <p className="text-body whitespace-pre-line break-words">
                  <bdi>{dispute.note}</bdi>
                </p>
                <div className="text-muted-foreground text-meta space-y-0.5">
                  <p>{lines.adjustedBy}</p>
                  {lines.adjustedNote ? (
                    <p className="break-words">{lines.adjustedNote}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      decide.reset();
                      setDecision({ dispute, upheld: true });
                      setConfirming(true);
                    }}
                  >
                    {m.rating.dispute.operator.uphold}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      decide.reset();
                      setDecision({ dispute, upheld: false });
                      setConfirming(true);
                    }}
                  >
                    {m.rating.dispute.operator.dismiss}
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link
                      href={playerProfilePath(
                        dispute.raisedBy.id,
                        dispute.override.sport,
                      )}
                    >
                      {o.openProfile}
                    </Link>
                  </Button>
                </div>
              </li>
            );
          })}
        </RowList>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={decision?.upheld ? o.upholdTitle : o.dismissTitle}
        description={
          decision?.upheld ? o.upholdDescription : o.dismissDescription
        }
        confirmLabel={
          decision?.upheld
            ? m.rating.dispute.operator.uphold
            : m.rating.dispute.operator.dismiss
        }
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
    </section>
  );
}

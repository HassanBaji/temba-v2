"use client";

import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { use, useState } from "react";
import { toast } from "sonner";

import { ChallengeAcceptDialog } from "~/components/challenges/challenge-accept-dialog";
import { ChallengeSeats } from "~/components/challenges/challenge-card";
import { ChallengeGameSummary } from "~/components/challenges/challenge-game-summary";
import {
  ProposalQueue,
  ViewerProposals,
} from "~/components/challenges/challenge-proposals";
import { ConfirmDialog } from "~/components/common/confirm-dialog";
import { ErrorState } from "~/components/common/error-state";
import { DetailPageSkeleton } from "~/components/common/page-skeleton";
import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { acceptTeamToPropose } from "@repo/domain/challenge-accept";
import {
  challengeCardView,
  challengeLevelWanted,
} from "@repo/domain/challenge-card";
import { challengesTabQuery } from "@repo/domain/challenges-tab";
import { formatGameDay } from "@repo/domain/format-game-start";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { headToHeadLine } from "@repo/domain/team-rivals";
import { api } from "~/trpc/react";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5 py-3">
      <dt className="text-eyebrow text-muted-foreground font-mono uppercase">
        {label}
      </dt>
      <dd className="text-body">{value}</dd>
    </div>
  );
}

/**
 * 2a: one Challenge in its open state, with Accept for a Team that may
 * propose; 2c: the viewer's pending Proposal; the poster's Proposal queue,
 * where one is confirmed into the Challenge Game; 2d: the confirmed state.
 */
export default function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const m = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const utils = api.useUtils();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [accepting, setAccepting] = useState<{ teamId: string } | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const challenge = api.challenges.byId.useQuery({ id });
  const withdraw = api.challenges.withdraw.useMutation({
    onSuccess: async () => {
      toast.success(m.challenge.detail.withdrawn);
      await Promise.all([
        utils.challenges.byId.invalidate({ id }),
        utils.challenges.listOpen.invalidate(),
        utils.challenges.listMine.invalidate(),
        utils.challenges.listPostOptions.invalidate(),
      ]);
      router.push(`/dashboard/challenges${challengesTabQuery("mine")}`);
    },
  });
  const refreshProposals = () =>
    Promise.all([
      utils.challenges.byId.invalidate({ id }),
      utils.challenges.listProposeOptions.invalidate({ challengeId: id }),
      utils.challenges.listOpen.invalidate(),
      utils.challenges.listMine.invalidate(),
    ]);
  const withdrawProposal = api.challenges.withdrawProposal.useMutation({
    onSuccess: async () => {
      toast.success(m.challenge.proposal.withdrawn);
      await refreshProposals();
    },
  });
  const confirmProposal = api.challenges.confirmProposal.useMutation({
    onSuccess: async (result) => {
      toast.success(m.challenge.proposal.confirmed);
      await Promise.all([refreshProposals(), utils.games.invalidate()]);
      router.push(`/dashboard/games/${result.gameId}`);
    },
  });
  const decline = api.challenges.declineProposal.useMutation({
    onSuccess: async () => {
      toast.success(m.challenge.proposal.declined);
      await refreshProposals();
    },
  });
  const detail = m.challenge.detail;
  const proposalCopy = m.challenge.proposal;

  if (isNotFoundError(challenge.error)) {
    notFound();
  }
  if (challenge.error) {
    return (
      <DashboardShell title={detail.title} isSubPage>
        <ErrorState
          headingLevel={2}
          title={detail.errorTitle}
          message={challenge.error.message}
          onRetry={() => {
            void challenge.refetch();
          }}
        />
      </DashboardShell>
    );
  }
  if (!challenge.data) {
    return (
      <DashboardShell title={detail.title} hidePageHeader isSubPage>
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  const data = challenge.data;
  const card = challengeCardView(
    { ...data, viewer: { ineligibleReason: data.viewer.ineligibleReason } },
    locale,
    new Date(),
  );
  const proposingTeam = acceptTeamToPropose(
    data.viewerEligibleTeams,
    data.viewerProposals,
  );
  const eligibleLine =
    data.viewerEligibleTeams.length > 0
      ? detail.proposeWith(
          data.viewerEligibleTeams
            .map((team) => team.displayName)
            .join(m.challenge.when.listSeparator),
        )
      : null;

  return (
    <DashboardShell title={card.title} description={card.sportLine} isSubPage>
      <div className="space-y-6">
        {data.game ? (
          <ChallengeGameSummary game={data.game} />
        ) : data.state !== "open" ? (
          <p role="status" className="text-body font-semibold">
            {detail.closed[data.state]}
          </p>
        ) : null}
        <div className="border-border space-y-3 rounded-lg border p-5">
          <Link
            href={`/dashboard/teams/${data.team.id}`}
            className="text-title font-semibold underline-offset-4 hover:underline"
          >
            {card.title}
          </Link>
          <ChallengeSeats card={card} />
          {data.state === "open" ? (
            <p className="text-meta text-muted-foreground">
              {card.proposalsLine}
            </p>
          ) : null}
        </div>
        <dl className="border-border divide-border divide-y rounded-lg border px-5">
          <DetailRow
            label={detail.record}
            value={headToHeadLine(data.team.record, data.sport, locale)}
          />
          <DetailRow
            label={detail.when}
            value={[card.whenLine, card.slotsLine]
              .filter((line): line is string => line != null)
              .join(m.group.metaSeparator)}
          />
          <DetailRow label={detail.where} value={card.venuesLine} />
          <DetailRow
            label={detail.level}
            value={challengeLevelWanted(
              data.levelMinTenths,
              data.levelMaxTenths,
              locale,
            )}
          />
          {data.note ? (
            <DetailRow label={detail.note} value={data.note} />
          ) : null}
        </dl>
        <p className="text-meta text-muted-foreground">
          {detail.postedBy(
            data.postedBy.name ?? m.team.memberFallback,
            formatGameDay(data.createdAt, locale, { weekday: "short" }),
          )}
        </p>
        {data.state === "open" && card.nudgeLine ? (
          <p className="text-body font-medium">{card.nudgeLine}</p>
        ) : null}
        {data.state === "open" && eligibleLine ? (
          <p className="text-body font-medium">{eligibleLine}</p>
        ) : null}
        {data.state === "open" && card.greyedLine ? (
          <p className="text-body font-medium">{card.greyedLine}</p>
        ) : null}
        {data.state === "open" && proposingTeam ? (
          <Button
            type="button"
            size="lg"
            aria-label={m.challenge.accept.ctaA11y(card.title)}
            onClick={() => setAccepting({ teamId: proposingTeam.id })}
          >
            {m.challenge.accept.cta}
          </Button>
        ) : null}
        <ViewerProposals
          proposals={data.viewerProposals}
          posterTeamName={card.title}
          focus={data.proposalQueue.length === 0}
          onChange={(proposal) => setAccepting({ teamId: proposal.team.id })}
          onWithdraw={(proposal) => setWithdrawing(proposal.id)}
        />
        {data.viewerCanDecide ? (
          <ProposalQueue
            proposals={data.proposalQueue}
            onConfirm={(proposal) => setConfirming(proposal.id)}
            onDecline={(proposal) => setDeclining(proposal.id)}
          />
        ) : null}
        {data.viewerCanWithdraw ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setWithdrawOpen(true)}
          >
            {detail.withdraw}
          </Button>
        ) : null}
      </div>
      <ConfirmDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        title={detail.withdrawConfirm.title}
        description={detail.withdrawConfirm.description}
        confirmLabel={detail.withdrawConfirm.confirm}
        pending={withdraw.isPending}
        onConfirm={async () => {
          await withdraw.mutateAsync({ challengeId: id });
        }}
      />
      <ConfirmDialog
        open={withdrawing != null}
        onOpenChange={(open) => {
          if (!open) {
            setWithdrawing(null);
          }
        }}
        title={proposalCopy.withdrawConfirm.title}
        description={proposalCopy.withdrawConfirm.description}
        confirmLabel={proposalCopy.withdrawConfirm.confirm}
        pending={withdrawProposal.isPending}
        onConfirm={async () => {
          if (withdrawing) {
            await withdrawProposal.mutateAsync({ proposalId: withdrawing });
          }
        }}
      />
      <ConfirmDialog
        open={confirming != null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirming(null);
          }
        }}
        title={proposalCopy.confirmSheet.title}
        description={proposalCopy.confirmSheet.description}
        confirmLabel={proposalCopy.confirmSheet.confirm}
        pending={confirmProposal.isPending}
        onConfirm={async () => {
          if (confirming) {
            await confirmProposal.mutateAsync({ proposalId: confirming });
          }
        }}
      />
      <ConfirmDialog
        open={declining != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeclining(null);
          }
        }}
        title={proposalCopy.declineConfirm.title}
        description={proposalCopy.declineConfirm.description}
        confirmLabel={proposalCopy.declineConfirm.confirm}
        pending={decline.isPending}
        onConfirm={async () => {
          if (declining) {
            await decline.mutateAsync({ proposalId: declining });
          }
        }}
      />
      <ChallengeAcceptDialog
        challengeId={id}
        open={accepting != null}
        teamId={accepting?.teamId}
        onOpenChange={(open) => {
          if (!open) {
            setAccepting(null);
          }
        }}
      />
    </DashboardShell>
  );
}

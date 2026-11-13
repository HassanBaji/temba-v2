"use client";

import Link from "next/link";
import { notFound, useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ChallengeAcceptDialog } from "~/components/challenges/challenge-accept-dialog";
import {
  ChallengeFootnote,
  ChallengeInfoRows,
  ChallengeNote,
  ChallengeTag,
  ChallengeTeamVsTeam,
} from "~/components/challenges/challenge-detail-parts";
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
import { BackButton } from "~/components/ui/nav-icon-button";
import { Surface } from "~/components/ui/surface";
import { cn } from "~/lib/utils";
import { acceptTeamToPropose } from "@repo/domain/challenge-accept";
import { challengeCardView } from "@repo/domain/challenge-card";
import {
  challengeConfirmedView,
  challengeConfirmSheetDescription,
  challengeDetailFooter,
  challengeDetailRows,
  challengeDetailStatusLine,
  challengeTeamFaceView,
  type ChallengeTeamFace,
} from "@repo/domain/challenge-detail";
import { challengesTabQuery } from "@repo/domain/challenges-tab";
import { isNotFoundError } from "@repo/domain/is-not-found-error";
import { api, type RouterOutputs } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";

type ChallengeDetail = RouterOutputs["challenges"]["byId"];

const CHALLENGES_FALLBACK = "/dashboard/challenges";

/** Edge to edge on phones, matching the mobile App; a card from `md` up. */
const HERO_BLEED =
  "-mx-4 px-4 py-[22px] min-[430px]:-mx-5 min-[430px]:px-5 md:mx-0 md:rounded-xl md:p-[22px]";

function faceFor(
  data: ChallengeDetail,
  teamId: string | null | undefined,
): ChallengeTeamFace | null {
  return data.teamFaces.find((face) => face.id === teamId) ?? null;
}

function posterFace(data: ChallengeDetail): ChallengeTeamFace {
  return (
    faceFor(data, data.team.id) ?? {
      id: data.team.id,
      displayName: data.team.displayName,
      sport: data.sport,
      rosterCount: data.team.rosterCount,
      teamLevel: data.team.teamLevel,
      members: data.team.members.map((member) => ({
        name: member.name,
        isViewer: false,
      })),
    }
  );
}

/** "2 proposals so far" and Accept, pinned to the bottom on phones. */
function AcceptBar({
  title,
  hint,
  label,
  accessibilityLabel,
  disabled,
  onAccept,
}: {
  title: string;
  hint: string;
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onAccept: () => void;
}) {
  return (
    <div
      className={cn(
        "bg-background border-rule flex items-center gap-3.5",
        "max-lg:fixed max-lg:inset-x-0 max-lg:bottom-0 max-lg:z-40 max-lg:border-t max-lg:px-[22px] max-lg:pb-[max(28px,env(safe-area-inset-bottom))] max-lg:pt-3",
        "lg:bg-paper lg:rounded-card lg:border lg:p-4",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold">{title}</p>
        <p className="text-meta text-muted-foreground">{hint}</p>
      </div>
      <Button
        type="button"
        size="lg"
        className="h-[52px] px-[34px] font-semibold"
        aria-label={accessibilityLabel}
        disabled={disabled}
        onClick={onAccept}
      >
        {label}
      </Button>
    </div>
  );
}

function PaperHeader({ status }: { status: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <BackButton href={CHALLENGES_FALLBACK} />
        <ChallengeTag />
      </div>
      <p role="status" className="text-meta text-muted-foreground mt-3.5">
        {status}
      </p>
    </div>
  );
}

/**
 * 2a: one Challenge in its open state, with Accept for a Team that may
 * propose; 2c: the viewer's pending Proposal; the poster's Proposal queue,
 * where one is confirmed into the Challenge Game; 2d: the confirmed state,
 * on ink. `?accept=1` opens the Accept sheet on arrival.
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
  const searchParams = useSearchParams();
  const utils = api.useUtils();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [accepting, setAccepting] = useState<{ teamId: string } | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const openedFromLink = useRef(false);
  const challenge = api.challenges.byId.useQuery({ id });
  const withdraw = api.challenges.withdraw.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.challenge.detail.withdrawn);
      await Promise.all([
        utils.challenges.byId.invalidate({ id }),
        utils.challenges.listOpen.invalidate(),
        utils.challenges.listMine.invalidate(),
        utils.challenges.listPostOptions.invalidate(),
      ]);
      router.push(`${CHALLENGES_FALLBACK}${challengesTabQuery("mine")}`);
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
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.challenge.proposal.withdrawn);
      await refreshProposals();
    },
  });
  const confirmProposal = api.challenges.confirmProposal.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async (result) => {
      toast.success(m.challenge.proposal.confirmed);
      await Promise.all([refreshProposals(), utils.games.invalidate()]);
      router.push(`/dashboard/games/${result.gameId}`);
    },
  });
  const decline = api.challenges.declineProposal.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(m.challenge.proposal.declined);
      await refreshProposals();
    },
  });
  const detail = m.challenge.detail;
  const proposalCopy = m.challenge.proposal;
  const data = challenge.data;
  const proposingTeam = data
    ? acceptTeamToPropose(data.viewerEligibleTeams, data.viewerProposals)
    : null;
  const proposingTeamId = data?.state === "open" ? proposingTeam?.id : null;

  useEffect(() => {
    if (
      !openedFromLink.current &&
      searchParams.get("accept") === "1" &&
      proposingTeamId
    ) {
      openedFromLink.current = true;
      setAccepting({ teamId: proposingTeamId });
    }
  }, [searchParams, proposingTeamId]);

  if (isNotFoundError(challenge.error)) {
    notFound();
  }
  if (challenge.error) {
    return (
      <DashboardShell title={detail.title} isSubPage>
        <ErrorState
          headingLevel={2}
          title={detail.errorTitle}
          error={challenge.error}
          onRetry={() => {
            void challenge.refetch();
          }}
        />
      </DashboardShell>
    );
  }
  if (!data) {
    return (
      <DashboardShell title={detail.title} hidePageHeader isSubPage>
        <DetailPageSkeleton />
      </DashboardShell>
    );
  }

  const now = new Date();
  const card = challengeCardView(
    { ...data, viewer: { ineligibleReason: data.viewer.ineligibleReason } },
    locale,
    now,
  );
  const open = data.state === "open";
  const poster = challengeTeamFaceView(posterFace(data), locale);
  const viewerProposal = data.viewerProposals[0] ?? null;
  const proposerFace = viewerProposal
    ? faceFor(data, viewerProposal.team.id)
    : null;
  const status = challengeDetailStatusLine(
    {
      state: data.state,
      expiresAt: data.expiresAt,
      posterName: data.team.displayName,
      hasViewerProposal: viewerProposal != null,
      gameCancelled: data.game?.cancelled ?? false,
    },
    now,
    locale,
  );
  const rows = challengeDetailRows(data, locale);
  const footer = challengeDetailFooter(data.proposalCount, locale);
  const actsForPoster = data.viewer.actsForPoster;
  const showAcceptBar =
    open && !actsForPoster && data.viewerProposals.length === 0;
  const missing = {
    name: actsForPoster
      ? m.challenge.card.opponentSeats
      : m.challenge.detailScreen.opponentName,
    line: m.challenge.detailScreen.opponentLine,
  };
  const game = data.game;

  const dialogs = (
    <>
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
        onOpenChange={(next) => {
          if (!next) {
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
        onOpenChange={(next) => {
          if (!next) {
            setConfirming(null);
          }
        }}
        title={proposalCopy.confirmSheet.title}
        description={challengeConfirmSheetDescription(data.sport, locale)}
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
        onOpenChange={(next) => {
          if (!next) {
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
        onOpenChange={(next) => {
          if (!next) {
            setAccepting(null);
          }
        }}
      />
    </>
  );

  if (game) {
    const otherSide =
      game.sides.find(
        (side) => side.teamId != null && side.teamId !== data.team.id,
      ) ?? null;
    const opponent =
      faceFor(data, game.proposedBy.teamId) ?? faceFor(data, otherSide?.teamId);
    const opponentName =
      opponent?.displayName ?? otherSide?.displayName ?? missing.name;
    const viewerOnPoster = posterFace(data).members.some(
      (member) => member.isViewer,
    );
    const opponentView = opponent
      ? challengeTeamFaceView(opponent, locale)
      : null;
    const [left, right] =
      opponentView && !viewerOnPoster
        ? [opponentView, poster]
        : [poster, opponentView];
    const confirmed = challengeConfirmedView(
      { ...game, sport: game.sport ?? data.sport },
      { proposer: opponentName, poster: data.team.displayName },
      now,
      locale,
    );
    const tone =
      !game.cancelled &&
      new Date(game.endsAt ?? game.startsAt).getTime() > now.getTime()
        ? "ink"
        : "paper";
    const muted = tone === "ink" ? "text-dim" : "text-muted-foreground";
    return (
      <DashboardShell
        title={card.title}
        hidePageHeader
        hideMobileTopBar
        isSubPage
        hideNav
      >
        <div className="space-y-[22px]">
          <Surface
            tone={tone}
            className={cn(
              HERO_BLEED,
              tone === "paper" && "border-rule border-y md:border",
            )}
          >
            <div className="flex items-center justify-between">
              <BackButton
                variant="boxed"
                surface={tone}
                href={CHALLENGES_FALLBACK}
              />
              <ChallengeTag tone={tone} />
            </div>
            <p role="status" className={cn("text-meta mt-7", muted)}>
              {confirmed.statusLine}
            </p>
            <h1 className="mt-2.5 flex items-baseline gap-2">
              <span className="font-expanded text-[54px] leading-[0.94]">
                {confirmed.time}
              </span>
              {confirmed.meridiem ? (
                <span className={cn("text-[22px] font-medium", muted)}>
                  {confirmed.meridiem}
                </span>
              ) : null}
            </h1>
            <p className="text-lead mt-2">{confirmed.dayLine}</p>
            {confirmed.placeLine ? (
              <p className={cn("text-meta", muted)}>{confirmed.placeLine}</p>
            ) : null}
            <div
              aria-hidden="true"
              className={cn(
                "mb-[18px] mt-[22px] h-px",
                tone === "ink" ? "bg-dimrule" : "bg-rule",
              )}
            />
            <ChallengeTeamVsTeam
              tone={tone}
              left={left}
              right={right}
              missing={missing}
              className={tone === "paper" ? "border-0 p-0" : undefined}
            />
            <Button
              asChild
              variant={tone === "ink" ? "inverse" : "default"}
              className="mt-5 h-[50px] w-full rounded-lg font-semibold"
            >
              <Link href={`/dashboard/games/${game.id}`}>
                {m.challenge.detailScreen.confirmed.viewGame}
              </Link>
            </Button>
          </Surface>
          <div>
            <ChallengeInfoRows rows={confirmed.rows} />
            <ChallengeFootnote>{confirmed.closedNote}</ChallengeFootnote>
          </div>
        </div>
        {dialogs}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={card.title}
      hidePageHeader
      hideMobileTopBar
      isSubPage
      hideNav
    >
      <h1 className="sr-only">{card.title}</h1>
      <div
        className={cn(
          "space-y-[22px] pt-[22px] md:pt-0",
          showAcceptBar && "max-lg:pb-28",
        )}
      >
        <div className="space-y-[18px]">
          <PaperHeader status={status} />
          <ChallengeTeamVsTeam
            left={poster}
            right={
              proposerFace ? challengeTeamFaceView(proposerFace, locale) : null
            }
            missing={missing}
          />
        </div>
        {data.viewerProposals.length > 0 ? (
          <ViewerProposals
            proposals={data.viewerProposals}
            posterTeamName={data.team.displayName}
            sport={data.sport}
            withdrawingId={
              withdrawProposal.isPending
                ? (withdrawProposal.variables?.proposalId ?? null)
                : null
            }
            onChange={(proposal) => setAccepting({ teamId: proposal.team.id })}
            onWithdraw={(proposal) => setWithdrawing(proposal.id)}
          />
        ) : null}
        {data.viewerCanDecide ? (
          <ProposalQueue
            proposals={data.proposalQueue}
            posterTeamName={data.team.displayName}
            onConfirm={(proposal) => setConfirming(proposal.id)}
            onDecline={(proposal) => setDeclining(proposal.id)}
          />
        ) : null}
        {open && card.nudgeLine ? (
          <p className="text-body font-medium">{card.nudgeLine}</p>
        ) : null}
        <ChallengeInfoRows rows={rows} />
        {data.note ? <ChallengeNote note={data.note} /> : null}
        {data.viewerCanWithdraw ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setWithdrawOpen(true)}
          >
            {detail.withdraw}
          </Button>
        ) : null}
        {showAcceptBar ? (
          <AcceptBar
            title={footer.title}
            hint={
              proposingTeam ? footer.hint : (card.greyedLine ?? footer.hint)
            }
            label={m.challenge.accept.cta}
            accessibilityLabel={m.challenge.accept.ctaA11y(card.title)}
            disabled={!proposingTeam}
            onAccept={() => {
              if (proposingTeam) {
                setAccepting({ teamId: proposingTeam.id });
              }
            }}
          />
        ) : null}
      </div>
      {dialogs}
    </DashboardShell>
  );
}

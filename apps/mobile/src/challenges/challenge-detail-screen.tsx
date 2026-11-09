import { spacing } from "@repo/design-tokens";
import { acceptTeamToPropose } from "@repo/domain/challenge-accept";
import { challengeCardView } from "@repo/domain/challenge-card";
import {
  challengeConfirmedView,
  challengeDetailFooter,
  challengeDetailRows,
  challengeDetailStatusLine,
  challengeTeamFaceView,
  type ChallengeTeamFace,
} from "@repo/domain/challenge-detail";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";

import { useLightStatusBar } from "../create-game/step-shell";
import {
  ConfirmSheet,
  type ConfirmRequest,
} from "../game-details/confirm-sheet";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Screen } from "../primitives/screen";
import { ScreenHeader } from "../primitives/screen-header";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useToast } from "../primitives/toast";
import { gamePath } from "../games/games-model";
import { api } from "../trpc/react";
import { AcceptSheet } from "./accept-sheet";
import {
  ChallengeFootnote,
  ChallengeHeaderRow,
  ChallengeInfoRows,
  ChallengeNote,
  ChallengeTeamVsTeam,
} from "./challenge-detail-parts";
import { ProposalQueue, ViewerProposals } from "./challenge-detail-proposals";
import {
  CHALLENGES_PATH,
  challengeCardInput,
  MINE_PATH,
  type ChallengeDetail,
} from "./challenges-model";

const REFETCH_ON_FOREGROUND = { refetchOnWindowFocus: "always" as const };
const HERO_PADDING_BOTTOM = 22;
const STATUS_GAP = 14;

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

function LightStatusBar() {
  useLightStatusBar();
  return null;
}

/**
 * 2a: one Challenge in its open state, with Accept for a Team that may
 * propose; 2c: the viewer's pending Proposal; the poster's Proposal queue,
 * where one is confirmed into the Challenge Game; 2d: the confirmed state,
 * on ink. `openAccept` opens the Accept sheet once the Challenge loads.
 */
export function ChallengeDetailScreen({
  challengeId,
  openAccept = false,
}: {
  challengeId: string;
  openAccept?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const m = useMessages();
  const locale = useLocale();
  const utils = api.useUtils();
  const [refreshing, setRefreshing] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [accepting, setAccepting] = useState<{ teamId: string | null } | null>(
    null,
  );
  const openedFromLink = useRef(false);
  const challenge = api.challenges.byId.useQuery(
    { id: challengeId },
    REFETCH_ON_FOREGROUND,
  );

  const withdraw = api.challenges.withdraw.useMutation({
    onSuccess: async () => {
      toast.show(m.challenge.detail.withdrawn);
      await Promise.all([
        utils.challenges.byId.invalidate({ id: challengeId }),
        utils.challenges.listOpen.invalidate(),
        utils.challenges.listMine.invalidate(),
        utils.challenges.listPostOptions.invalidate(),
      ]);
      router.replace(MINE_PATH);
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const refreshProposals = () =>
    Promise.all([
      utils.challenges.byId.invalidate({ id: challengeId }),
      utils.challenges.listProposeOptions.invalidate({ challengeId }),
      utils.challenges.listOpen.invalidate(),
      utils.challenges.listMine.invalidate(),
    ]);
  const withdrawProposal = api.challenges.withdrawProposal.useMutation({
    onSuccess: async () => {
      toast.show(m.challenge.proposal.withdrawn);
      await refreshProposals();
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });
  const confirmProposal = api.challenges.confirmProposal.useMutation({
    onSuccess: async (result) => {
      toast.show(m.challenge.proposal.confirmed);
      await Promise.all([refreshProposals(), utils.games.invalidate()]);
      router.push(gamePath(result.gameId));
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });
  const decline = api.challenges.declineProposal.useMutation({
    onSuccess: async () => {
      toast.show(m.challenge.proposal.declined);
      await refreshProposals();
    },
    onError: (error) => toast.show(error.message),
    onSettled: () => setConfirm(null),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await challenge.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [challenge]);

  const data = challenge.data;
  const proposingTeam = data
    ? acceptTeamToPropose(data.viewerEligibleTeams, data.viewerProposals)
    : null;
  const proposingTeamId = data?.state === "open" ? proposingTeam?.id : null;

  useEffect(() => {
    if (openAccept && !openedFromLink.current && proposingTeamId) {
      openedFromLink.current = true;
      setAccepting({ teamId: proposingTeamId });
    }
  }, [openAccept, proposingTeamId]);

  const header = (
    <ScreenHeader
      nav="back"
      fallback={CHALLENGES_PATH}
      title={m.challenge.detail.title}
    />
  );

  if (challenge.isLoading) {
    return (
      <Screen>
        {header}
        <Skeleton height={320} radius={16} />
      </Screen>
    );
  }
  if (challenge.error || !data) {
    return (
      <Screen>
        {header}
        <Notice
          alert
          title={m.challenge.detail.errorTitle}
          description={challenge.error?.message ?? ""}
          onRetry={() => void challenge.refetch()}
        />
      </Screen>
    );
  }

  const now = new Date();
  const card = challengeCardView(challengeCardInput(data), locale, now);
  const open = data.state === "open";
  const detail = m.challenge.detail;
  const screen = m.challenge.detailScreen;
  const poster = challengeTeamFaceView(posterFace(data), locale);
  const viewerProposal = data.viewerProposals[0] ?? null;
  const proposerFace = viewerProposal
    ? faceFor(data, viewerProposal.team.id)
    : null;
  const actsForPoster = data.viewer.actsForPoster;
  const missing = {
    name: actsForPoster ? m.challenge.card.opponentSeats : screen.opponentName,
    line: screen.opponentLine,
  };
  const showAcceptBar =
    open && !actsForPoster && data.viewerProposals.length === 0;
  const footer = challengeDetailFooter(data.proposalCount, locale);

  const sheets = (
    <>
      <ConfirmSheet
        request={confirm}
        pending={
          withdraw.isPending ||
          withdrawProposal.isPending ||
          decline.isPending ||
          confirmProposal.isPending
        }
        onClose={() => setConfirm(null)}
      />
      <AcceptSheet
        challengeId={challengeId}
        visible={accepting != null}
        teamId={accepting?.teamId}
        onClose={() => setAccepting(null)}
      />
    </>
  );

  const game = data.game;
  if (game) {
    const otherSide =
      game.sides.find(
        (side) => side.teamId != null && side.teamId !== data.team.id,
      ) ?? null;
    const opponent =
      faceFor(data, game.proposedBy.teamId) ?? faceFor(data, otherSide?.teamId);
    const opponentView = opponent
      ? challengeTeamFaceView(opponent, locale)
      : null;
    const viewerOnPoster = posterFace(data).members.some(
      (member) => member.isViewer,
    );
    const [left, right] =
      opponentView && !viewerOnPoster
        ? [opponentView, poster]
        : [poster, opponentView];
    const confirmed = challengeConfirmedView(
      { ...game, sport: game.sport ?? data.sport },
      {
        proposer:
          opponent?.displayName ?? otherSide?.displayName ?? missing.name,
        poster: data.team.displayName,
      },
      now,
      locale,
    );
    const tone =
      !game.cancelled &&
      new Date(game.endsAt ?? game.startsAt).getTime() > now.getTime()
        ? "ink"
        : "paper";
    return (
      <Screen
        refreshing={refreshing}
        onRefresh={onRefresh}
        statusBarTone={tone}
        header={
          <Surface
            tone={tone}
            style={{
              paddingTop: spacing.compact,
              paddingBottom: HERO_PADDING_BOTTOM,
              borderRadius: 0,
              borderWidth: 0,
            }}
          >
            {tone === "ink" ? <LightStatusBar /> : null}
            <ChallengeHeaderRow fallback={MINE_PATH} />
            <Text size="meta" tone="muted" style={{ marginTop: 28 }}>
              {confirmed.statusLine}
            </Text>
            <View
              accessible
              accessibilityRole="header"
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: 8,
                marginTop: 10,
              }}
            >
              <Text size="heroTime" weight="bold" width="expanded">
                {confirmed.time}
              </Text>
              {confirmed.meridiem ? (
                <Text size="figure" weight="medium" tone="muted">
                  {confirmed.meridiem}
                </Text>
              ) : null}
            </View>
            <Text size="lead" style={{ marginTop: 8 }}>
              {confirmed.dayLine}
            </Text>
            {confirmed.placeLine ? (
              <Text size="meta" tone="muted">
                {confirmed.placeLine}
              </Text>
            ) : null}
            <View style={{ marginTop: 22, marginBottom: 18 }}>
              <Hairline />
            </View>
            <ChallengeTeamVsTeam
              left={left}
              right={right}
              missing={missing}
              boxed={false}
            />
            <View style={{ marginTop: 20 }}>
              <Button
                label={screen.confirmed.viewGame}
                size="lg"
                onPress={() => router.push(gamePath(game.id))}
              />
            </View>
          </Surface>
        }
      >
        <View>
          <ChallengeInfoRows rows={confirmed.rows} />
          <ChallengeFootnote>{confirmed.closedNote}</ChallengeFootnote>
        </View>
        {sheets}
      </Screen>
    );
  }

  const status = challengeDetailStatusLine(
    {
      state: data.state,
      expiresAt: data.expiresAt,
      posterName: data.team.displayName,
      hasViewerProposal: viewerProposal != null,
      gameCancelled: false,
    },
    now,
    locale,
  );

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={onRefresh}
      footer={
        showAcceptBar ? (
          <>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold">{footer.title}</Text>
              <Text size="meta" tone="muted">
                {proposingTeam ? footer.hint : (card.greyedLine ?? footer.hint)}
              </Text>
            </View>
            <Button
              label={m.challenge.accept.cta}
              accessibilityLabel={m.challenge.accept.ctaA11y(card.title)}
              size="lg"
              disabled={!proposingTeam}
              onPress={() =>
                proposingTeam
                  ? setAccepting({ teamId: proposingTeam.id })
                  : undefined
              }
            />
          </>
        ) : undefined
      }
    >
      <View style={{ gap: spacing.surface }}>
        <View style={{ gap: 18 }}>
          <View style={{ gap: STATUS_GAP }}>
            <ChallengeHeaderRow fallback={CHALLENGES_PATH} />
            <Text size="meta" tone="muted">
              {status}
            </Text>
          </View>
          <ChallengeTeamVsTeam
            left={poster}
            right={
              proposerFace ? challengeTeamFaceView(proposerFace, locale) : null
            }
            missing={missing}
          />
        </View>
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
          onWithdraw={(proposal) =>
            setConfirm({
              title: m.challenge.proposal.withdrawConfirm.title,
              description: m.challenge.proposal.withdrawConfirm.description,
              confirmLabel: m.challenge.proposal.withdrawConfirm.confirm,
              onConfirm: () =>
                withdrawProposal.mutate({ proposalId: proposal.id }),
            })
          }
        />
        {data.viewerCanDecide ? (
          <ProposalQueue
            proposals={data.proposalQueue}
            posterTeamName={data.team.displayName}
            confirmingId={
              confirmProposal.isPending
                ? (confirmProposal.variables?.proposalId ?? null)
                : null
            }
            decliningId={
              decline.isPending ? (decline.variables?.proposalId ?? null) : null
            }
            onConfirm={(proposal) =>
              setConfirm({
                title: m.challenge.proposal.confirmSheet.title,
                description: m.challenge.proposal.confirmSheet.description,
                details: [proposal.team.displayName],
                confirmLabel: m.challenge.proposal.confirmSheet.confirm,
                onConfirm: () =>
                  confirmProposal.mutate({ proposalId: proposal.id }),
              })
            }
            onDecline={(proposal) =>
              setConfirm({
                title: m.challenge.proposal.declineConfirm.title,
                description: m.challenge.proposal.declineConfirm.description,
                details: [proposal.team.displayName],
                confirmLabel: m.challenge.proposal.declineConfirm.confirm,
                onConfirm: () => decline.mutate({ proposalId: proposal.id }),
              })
            }
          />
        ) : null}
        {open && card.nudgeLine ? (
          <Text weight="medium">{card.nudgeLine}</Text>
        ) : null}
        <ChallengeInfoRows rows={challengeDetailRows(data, locale)} />
        {data.note ? <ChallengeNote note={data.note} /> : null}
        {data.viewerCanWithdraw ? (
          <Button
            label={detail.withdraw}
            variant="outline"
            onPress={() =>
              setConfirm({
                title: detail.withdrawConfirm.title,
                description: detail.withdrawConfirm.description,
                confirmLabel: detail.withdrawConfirm.confirm,
                onConfirm: () => withdraw.mutate({ challengeId }),
              })
            }
          />
        ) : null}
      </View>
      {sheets}
    </Screen>
  );
}

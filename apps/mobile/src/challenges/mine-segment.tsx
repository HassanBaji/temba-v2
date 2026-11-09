import { radii, spacing } from "@repo/design-tokens";
import {
  challengeCardView,
  challengeProposalView,
} from "@repo/domain/challenge-card";
import {
  challengeMineGameView,
  challengeMinePostedView,
  challengeMineSections,
  challengeMineWaitingView,
} from "@repo/domain/challenge-mine";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import type { Slot } from "../home/home-model";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { InitialsTile } from "../primitives/initials-tile";
import { ResultMark } from "../primitives/result-mark";
import { Skeleton } from "../primitives/skeleton";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { ChallengeSeats } from "./challenge-card";
import { challengeCardInput, type MineItem } from "./challenges-model";
import { SegmentEmpty } from "./segment-empty";

const ROW_PADDING = { paddingHorizontal: 16, paddingVertical: 14 } as const;
const MARK = 18;

export type MineSegmentProps = {
  items: Slot<MineItem[]>;
  confirmingId: string | null;
  decliningId: string | null;
  onOpenChallenge: (challengeId: string) => void;
  onOpenGame?: (gameId: string) => void;
  onConfirm: (proposal: { id: string; teamName: string }) => void;
  onDecline: (proposal: { id: string; teamName: string }) => void;
  onGoToTeams: () => void;
};

type ItemOf<K extends MineItem["kind"]> = Extract<MineItem, { kind: K }>;

function SectionHead({ title, hint }: { title: string; hint: string | null }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
        paddingBottom: 10,
      }}
    >
      <Text
        size="title"
        width="expanded"
        accessibilityRole="header"
        style={{ flexShrink: 1 }}
      >
        {title}
      </Text>
      {hint ? (
        <Text size="meta" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/** 1b's focus: a Proposal on your Challenge, confirmed or sent back from here. */
function WaitingCard({
  item,
  focus,
  props,
  now,
}: {
  item: ItemOf<"waiting">;
  focus: boolean;
  props: MineSegmentProps;
  now: Date;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = challengeMineWaitingView(item, now, locale);
  const proposal = { id: item.proposal.id, teamName: view.proposingTeam };
  const tile = focus ? "inverse" : "control";
  return (
    <Surface
      tone={focus ? "ink" : "paper"}
      padded={false}
      style={{ padding: spacing.compact, gap: 14 }}
    >
      <WaitingBody
        view={view}
        tile={tile}
        accessibilityLabel={m.challenge.mine.open(view.accessibilityLabel)}
        onOpen={() => props.onOpenChallenge(item.challengeId)}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={m.challenge.proposal.confirm}
            accessibilityLabel={m.challenge.proposal.confirmA11y(
              view.proposingTeam,
            )}
            pending={props.confirmingId === item.proposal.id}
            onPress={() => props.onConfirm(proposal)}
          />
        </View>
        <Button
          label={m.challenge.proposal.anotherTime}
          accessibilityLabel={m.challenge.proposal.anotherTimeA11y(
            view.proposingTeam,
          )}
          variant={focus ? "outline-inverse" : "outline"}
          pending={props.decliningId === item.proposal.id}
          onPress={() => props.onDecline(proposal)}
        />
      </View>
    </Surface>
  );
}

function WaitingBody({
  view,
  tile,
  accessibilityLabel,
  onOpen,
}: {
  view: ReturnType<typeof challengeMineWaitingView>;
  tile: "inverse" | "control";
  accessibilityLabel: string;
  onOpen: () => void;
}) {
  const palette = useTonePalette();
  return (
    <>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Text size="meta" tone="muted">
          {view.waitingLabel}
        </Text>
        <Text size="eyebrow" tone="muted">
          {view.expiresLine}
        </Text>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={accessibilityLabel}
        onPress={onOpen}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <InitialsTile name={view.posterTeam} tone={tile} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold">{view.title}</Text>
          <Text size="meta" tone="muted" style={{ marginTop: 2 }}>
            {view.subtitle}
          </Text>
        </View>
        <InitialsTile name={view.proposingTeam} tone={tile} />
      </Pressable>
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          borderWidth: hairline,
          borderColor: palette.rule,
          borderRadius: radii.lg,
          paddingHorizontal: 14,
          paddingVertical: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text size="eyebrow" tone="muted">
            {view.proposedLabel}
          </Text>
          <Text weight="semibold" style={{ marginTop: 2 }}>
            {view.proposedLine}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text size="eyebrow" tone="muted">
            {view.venueLabel}
          </Text>
          <Text weight="semibold" style={{ marginTop: 2 }}>
            {view.venueLine}
          </Text>
        </View>
      </View>
    </>
  );
}

/** Your Team's open Challenge: the line, the proposals so far, then the seats still to fill. */
function PostedCard({
  item,
  props,
  now,
}: {
  item: ItemOf<"posted">;
  props: MineSegmentProps;
  now: Date;
}) {
  const locale = useLocale();
  const input = challengeCardInput(item.challenge);
  const view = challengeMinePostedView(input, now, locale);
  const card = challengeCardView(input, locale, now);
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={view.accessibilityLabel}
        onPress={() => props.onOpenChallenge(item.challengeId)}
        style={({ pressed }) => ({
          ...ROW_PADDING,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <InitialsTile name={item.challenge.team.displayName} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold">{view.title}</Text>
          <Text size="eyebrow" tone="muted" style={{ marginTop: 2 }}>
            {view.line}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text size="meta" weight="semibold">
            {view.proposalsLine}
          </Text>
          <Text size="eyebrow" tone="muted">
            {view.daysLeftLine}
          </Text>
        </View>
      </Pressable>
      <Hairline />
      <View style={{ paddingHorizontal: 16, paddingVertical: 11 }}>
        <ChallengeSeats card={card} compact />
      </View>
    </Surface>
  );
}

/** A Proposal your Team sent, waiting on the poster. */
function PendingRow({
  item,
  props,
  now,
}: {
  item: ItemOf<"pending">;
  props: MineSegmentProps;
  now: Date;
}) {
  const m = useMessages();
  const locale = useLocale();
  const view = challengeProposalView(item.proposal, now, locale);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={m.challenge.mine.open(view.accessibilityLabel)}
      onPress={() => props.onOpenChallenge(item.challengeId)}
      style={({ pressed }) => ({
        ...ROW_PADDING,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <InitialsTile name={item.posterTeam.displayName} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">
          {m.challenge.proposal.waitingOn(item.posterTeam.displayName)}
        </Text>
        <Text size="eyebrow" tone="muted" style={{ marginTop: 2 }}>
          {m.challenge.tab.mine.gameLine(view.whenLine, view.whereLine)}
        </Text>
      </View>
      <Text size="eyebrow" tone="muted">
        {view.expiresLine}
      </Text>
    </Pressable>
  );
}

/** A confirmed Challenge, now a Game: View game until it is played, then the result. */
function GameRow({
  item,
  props,
}: {
  item: ItemOf<"accepted"> | ItemOf<"played">;
  props: MineSegmentProps;
}) {
  const m = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  const view = challengeMineGameView(item, locale);
  const open = () =>
    props.onOpenGame
      ? props.onOpenGame(item.gameId)
      : props.onOpenChallenge(item.challengeId);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={m.challenge.tab.mine.viewGameA11y(
        view.accessibilityLabel,
      )}
      onPress={open}
      style={({ pressed }) => ({
        ...ROW_PADDING,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
      >
        <InitialsTile name={item.team.displayName} size="md" />
        <Text size="eyebrow" tone="muted">
          {m.challenge.tab.vs}
        </Text>
        <InitialsTile name={item.opponent.displayName} size="md" />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight="semibold">{view.title}</Text>
        <Text size="eyebrow" tone="muted" style={{ marginTop: 2 }}>
          {view.line}
        </Text>
        {view.statusLine ? (
          <Text size="eyebrow" weight="semibold" style={{ marginTop: 2 }}>
            {view.statusLine}
          </Text>
        ) : null}
      </View>
      {view.mark ? (
        <ResultMark variant={view.mark} size={MARK} decorative />
      ) : (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            height: 34,
            paddingHorizontal: 12,
            justifyContent: "center",
            borderRadius: radii.md,
            borderWidth: hairline,
            borderColor: palette.rule,
          }}
        >
          <Text size="meta" weight="semibold">
            {m.challenge.tab.mine.viewGame}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function ListFrame({ children }: { children: React.ReactNode[] }) {
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {children.map((child, index) => (
        <Fragment key={index}>
          {index > 0 ? <Hairline /> : null}
          {child}
        </Fragment>
      ))}
    </Surface>
  );
}

/**
 * 1b: Proposals waiting on you first (the first on black), then your posted
 * Challenge, the Proposals you sent, and the Challenges that are now Games.
 */
export function MineSegment(props: MineSegmentProps) {
  const locale = useLocale();
  if (props.items.status === "loading") {
    return (
      <View style={{ gap: 12 }}>
        {[0, 1].map((key) => (
          <Skeleton key={key} height={160} radius={radii.surface} />
        ))}
      </View>
    );
  }
  if (props.items.status !== "ready" || props.items.value.length === 0) {
    return <SegmentEmpty segment="mine" onGoToTeams={props.onGoToTeams} />;
  }
  const now = new Date();
  return (
    <View style={{ gap: spacing.section }}>
      {challengeMineSections(props.items.value, locale).map((section) => {
        if (section.kind === "waiting") {
          return (
            <View key={section.kind} style={{ gap: 12 }}>
              {section.items.map(({ item, focus }) =>
                item.kind === "waiting" ? (
                  <WaitingCard
                    key={item.key}
                    item={item}
                    focus={focus}
                    props={props}
                    now={now}
                  />
                ) : null,
              )}
            </View>
          );
        }
        return (
          <View key={section.kind}>
            <SectionHead title={section.title} hint={section.hint} />
            {section.kind === "posted" ? (
              <View style={{ gap: 12 }}>
                {section.items.map(({ item }) =>
                  item.kind === "posted" ? (
                    <PostedCard
                      key={item.key}
                      item={item}
                      props={props}
                      now={now}
                    />
                  ) : null,
                )}
              </View>
            ) : (
              <ListFrame>
                {section.items.map(({ item }) =>
                  item.kind === "pending" ? (
                    <PendingRow
                      key={item.key}
                      item={item}
                      props={props}
                      now={now}
                    />
                  ) : item.kind === "accepted" || item.kind === "played" ? (
                    <GameRow key={item.key} item={item} props={props} />
                  ) : null,
                )}
              </ListFrame>
            )}
          </View>
        );
      })}
    </View>
  );
}

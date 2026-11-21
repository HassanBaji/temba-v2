import { radii } from "@repo/design-tokens";
import {
  bibNames,
  shortName,
  type BoardPlayer,
} from "@repo/domain/football-board";
import {
  footballDraftSavedLine,
  footballDraftSummary,
} from "@repo/domain/football-draft";
import { Pencil, Share as ShareIcon } from "lucide-react-native";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { useColors } from "../theme/theme-provider";
import type { RouterOutputs } from "../trpc/react";
import { BibChip } from "./bib-picker";
import { DraftAnswer } from "./draft-answer-mark";

type SavedDraft = NonNullable<RouterOutputs["games"]["footballBoard"]["draft"]>;

/** A captain's name as the draft card reads it: "You", a nickname, or "Rashid N". */
export function draftCaptainName(
  player: Pick<BoardPlayer, "name" | "nickname" | "isViewer"> | undefined,
  you: string,
) {
  if (!player) {
    return null;
  }
  return player.isViewer
    ? you
    : (player.nickname?.name ?? shortName(player.name));
}

/** The note a Side captain sent with a change asked, set apart under the row. */
export function DraftNote({ note }: { note: string }) {
  const colors = useColors();
  const m = useMessages().football.draft;
  return (
    <View
      style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: radii.md,
        backgroundColor: colors.wash,
      }}
    >
      <Text size="meta">{m.note(note)}</Text>
    </View>
  );
}

function SideAnswerRow({
  draft,
  side,
  players,
}: {
  draft: SavedDraft;
  side: 1 | 2;
  players: readonly BoardPlayer[];
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.captains;
  const key = side === 1 ? "slot1" : "slot2";
  const captainId = draft.captains[key];
  const captain = draftCaptainName(
    players.find((player) => player.userId === captainId),
    messages.common.you,
  );
  const answer = draft.answers[key];
  return (
    <View
      style={{
        gap: 10,
        paddingTop: 12,
        borderTopWidth: hairline,
        borderTopColor: colors.rule,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <BibChip bib={draft.bibs[key]} size={14} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold">{bibNames(draft.bibs, locale)[key]}</Text>
          <Text size="eyebrow" tone="muted" numberOfLines={1}>
            {captain ? m.named(captain) : m.none}
          </Text>
        </View>
        <DraftAnswer state={answer.state} />
      </View>
      {answer.state === "change_asked" && answer.note ? (
        <DraftNote note={answer.note} />
      ) : null}
    </View>
  );
}

export function DraftTag({ label }: { label: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        borderWidth: hairline,
        borderColor: colors.ink,
        borderRadius: radii.slot,
        paddingVertical: 3,
        paddingHorizontal: 6,
      }}
    >
      <Text size="eyebrow" mono uppercase style={{ letterSpacing: 0.8 }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * The Organizer's Draft line-up on the Game screen (ADR-0107, design 1c):
 * when it was saved, whether it can be published as it stands, each side's
 * Side captain and their answer (ADR-0108), then Publish teams, Share
 * draft and Edit draft. Publishing never waits on an answer.
 */
export function DraftCard({
  draft,
  players,
  game,
  publishPending,
  onPublish,
  onShare,
  onEdit,
}: {
  draft: SavedDraft;
  players: readonly BoardPlayer[];
  game: { groupId: string | null };
  publishPending: boolean;
  onPublish: () => void;
  onShare: () => void;
  onEdit: () => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.draft;
  const copy = messages.mobileGameDetails.football;
  const summary = footballDraftSummary(
    {
      ...draft.sides,
      bibs: draft.bibs,
      captains: draft.captains,
      answers: draft.answers,
    },
    players.map((player) => player.userId),
    locale,
    game,
  );
  return (
    <View style={{ gap: 12 }}>
      <Surface style={{ gap: 8, borderColor: colors.ink }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <DraftTag label={m.tag} />
          <Text
            weight="semibold"
            accessibilityRole="header"
            style={{ flex: 1 }}
          >
            {m.title}
          </Text>
          <Text size="meta" tone="muted">
            {footballDraftSavedLine(draft.savedAt, locale)}
          </Text>
        </View>
        <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
          {summary.line}
        </Text>
        <SideAnswerRow draft={draft} side={1} players={players} />
        <SideAnswerRow draft={draft} side={2} players={players} />
      </Surface>
      <Button
        label={copy.publishTeams}
        size="lg"
        disabled={!summary.canPublish}
        pending={publishPending}
        onPress={onPublish}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={messages.football.draftShare.title}
            variant="outline"
            icon={<ShareIcon size={16} color={colors.ink} />}
            onPress={onShare}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label={copy.editDraft}
            variant="outline"
            icon={<Pencil size={15} color={colors.ink} />}
            onPress={onEdit}
          />
        </View>
      </View>
      <Text size="eyebrow" tone="muted">
        {m.publishAnyTime}
      </Text>
    </View>
  );
}

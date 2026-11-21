import {
  bibNames,
  byKeeperThenLevel,
  shortName,
  teamsSideAverage,
  type BoardPlayer,
} from "@repo/domain/football-board";
import {
  FOOTBALL_DRAFT_NOTE_MAX_LENGTH,
  type FootballBalanceOn,
  type FootballDraftAnswer,
} from "@repo/domain/football-lineup";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useColors } from "../theme/theme-provider";
import type { RouterOutputs } from "../trpc/react";
import { BibChip } from "./bib-picker";
import { DraftAnswer, DraftAnswerMark } from "./draft-answer-mark";
import { DraftNote, DraftTag, draftCaptainName } from "./draft-card";

type SavedDraft = NonNullable<RouterOutputs["games"]["footballBoard"]["draft"]>;

function AskChangeSheet({
  visible,
  organizer,
  pending,
  onClose,
  onSend,
}: {
  visible: boolean;
  organizer: string;
  pending: boolean;
  onClose: () => void;
  onSend: (note: string) => void;
}) {
  const m = useMessages().football.draft.captainPanel.noteSheet;
  const [note, setNote] = useState("");

  useEffect(() => {
    if (visible) {
      setNote("");
    }
  }, [visible]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={m.title}
      subtitle={m.body(organizer)}
      closeButton
      keyboardShouldPersistTaps="handled"
    >
      <TextField
        label={m.label}
        placeholder={m.placeholder}
        value={note}
        multiline
        maxLength={FOOTBALL_DRAFT_NOTE_MAX_LENGTH}
        onChangeText={setNote}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={m.cancel}
            variant="outline"
            size="lg"
            onPress={onClose}
          />
        </View>
        <View style={{ flex: 1.6 }}>
          <Button
            label={m.send}
            size="lg"
            pending={pending}
            disabled={note.trim().length === 0}
            onPress={() => onSend(note.trim())}
          />
        </View>
      </View>
    </Sheet>
  );
}

/**
 * A Side captain's own team on the Draft line-up (design 2a, ADR-0108):
 * Approve my team or Ask for a change, and once answered the answer with
 * Undo. Under it the other team with its captain and that captain's answer,
 * whose note they never see.
 */
export function CaptainDraftPanel({
  draft,
  side,
  players,
  balanceOn,
  pending,
  onAnswer,
}: {
  draft: SavedDraft;
  side: 1 | 2;
  players: readonly BoardPlayer[];
  balanceOn: FootballBalanceOn;
  pending: boolean;
  onAnswer: (answer: FootballDraftAnswer | null, note?: string) => void;
}) {
  const colors = useColors();
  const locale = useLocale();
  const messages = useMessages();
  const m = messages.football.draft;
  const panel = m.captainPanel;
  const [asking, setAsking] = useState(false);
  const own = side === 1 ? "slot1" : "slot2";
  const other = side === 1 ? "slot2" : "slot1";
  const names = bibNames(draft.bibs, locale);
  const members = players
    .filter((player) => draft.sides[own].includes(player.userId))
    .sort(byKeeperThenLevel);
  const organizer = shortName(draft.savedByName);
  const answer = draft.answers[own];
  const otherCaptain = draftCaptainName(
    players.find((player) => player.userId === draft.captains[other]),
    messages.common.you,
  );

  useEffect(() => {
    if (answer.state === "change_asked") {
      setAsking(false);
    }
  }, [answer.state]);

  const answered = (title: string, body: string, note: string | null) => (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <DraftAnswerMark state={answer.state} size={24} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text weight="semibold">{title}</Text>
          <Text size="eyebrow" tone="muted">
            {body}
          </Text>
        </View>
        <Button
          label={panel.undo}
          variant="outline"
          size="sm"
          pending={pending}
          onPress={() => onAnswer(null)}
        />
      </View>
      {note ? <DraftNote note={note} /> : null}
    </View>
  );

  return (
    <View style={{ gap: 12 }}>
      <Surface style={{ gap: 12, borderColor: colors.ink }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <DraftTag label={m.tag} />
          <Text
            weight="semibold"
            accessibilityRole="header"
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {panel.yourTeam(names[own])}
          </Text>
          <Text size="eyebrow" tone="muted">
            {panel.playersAvg(
              members.length,
              teamsSideAverage(members, locale, balanceOn),
            )}
          </Text>
        </View>
        <View accessibilityLiveRegion="polite">
          {answer.state === "approved" ? (
            answered(
              panel.approvedTitle(names[own]),
              panel.approvedBody(organizer),
              null,
            )
          ) : answer.state === "change_asked" ? (
            answered(
              panel.changeTitle,
              panel.changeBody(organizer),
              answer.note,
            )
          ) : (
            <View style={{ gap: 12 }}>
              <Text size="meta" tone="muted">
                {panel.ask(organizer)}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label={panel.approve}
                    size="lg"
                    pending={pending && !asking}
                    onPress={() => onAnswer("approved")}
                  />
                </View>
                <Button
                  label={panel.askChange}
                  variant="outline"
                  size="lg"
                  disabled={pending}
                  onPress={() => setAsking(true)}
                />
              </View>
            </View>
          )}
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingTop: 12,
            borderTopWidth: hairline,
            borderTopColor: colors.rule,
          }}
        >
          <BibChip bib={draft.bibs[other]} size={14} />
          <Text size="meta" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
            {panel.otherTeam(names[other], otherCaptain)}
          </Text>
          <DraftAnswer state={draft.answers[other].state} />
        </View>
      </Surface>
      <Text size="eyebrow" tone="muted">
        {panel.ownTeamOnly(names[other])}
      </Text>
      <AskChangeSheet
        visible={asking}
        organizer={organizer}
        pending={pending}
        onClose={() => setAsking(false)}
        onSend={(note) => onAnswer("change_asked", note)}
      />
    </View>
  );
}

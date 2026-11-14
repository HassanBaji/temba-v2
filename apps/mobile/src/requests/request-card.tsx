import { radii, sizes } from "@repo/design-tokens";
import {
  waitingRequestCard,
  waitingRequestDoneText,
  type RequestDecision,
  type RequestRow,
  type WaitingRequest,
} from "@repo/domain/waiting-requests";
import { Check, Users, X } from "lucide-react-native";
import { Fragment } from "react";
import { Pressable, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { apiOrigin } from "../lib/api-origin-runtime";
import { mediaUrl } from "../lib/media-url";
import { SportGlyph } from "../lib/sport-glyph";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { Surface } from "../primitives/surface";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { useRequestAnswers } from "./request-answers-provider";
import { SeatGlyph } from "./seat-glyph";

const LEVEL_GLYPH = 13;
const WANT_ICON = 15;
const DONE_BOX = 26;
const DONE_ICON = 14;
const UNDO_HIT_SLOP = 10;

export type RequestOpen = { onPress: () => void; hint?: string };

/** Design 1d: who, what they want, why it reached you, then Approve and Decline in one tap. */
export function RequestCard({
  request,
  now,
  onAnswer,
  open,
  extra,
}: {
  request: WaitingRequest;
  now: Date;
  onAnswer: (decision: RequestDecision) => void;
  open?: RequestOpen;
  extra?: React.ReactNode;
}) {
  const m = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  const card = waitingRequestCard(request, locale, now);

  const nameLine = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text weight="semibold" numberOfLines={1} style={{ flexShrink: 1 }}>
        {card.name}
      </Text>
      {card.level ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <SportGlyph
            sport={card.sport}
            color={palette.muted}
            size={LEVEL_GLYPH}
          />
          <Text size="meta" weight="bold" width="expanded" tone="muted" ltr>
            {card.level}
          </Text>
        </View>
      ) : null}
      <View
        style={{
          marginStart: "auto",
          paddingStart: 6,
          flexDirection: "row",
          alignItems: "baseline",
          gap: 5,
        }}
      >
        <Text size="eyebrow" tone="muted" numberOfLines={1}>
          {card.clock.label}
        </Text>
        <Text size="meta" weight="semibold" numberOfLines={1}>
          {card.clock.value}
        </Text>
      </View>
    </View>
  );

  const identity = (
    <>
      <Avatar
        name={card.name}
        uri={mediaUrl(card.image, apiOrigin)}
        size="lg"
        radius={radii.lg}
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        {nameLine}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 7,
            marginTop: 5,
          }}
        >
          <View style={{ marginTop: 3 }}>
            {card.wantIcon === "seat" ? (
              <SeatGlyph color={palette.foreground} size={WANT_ICON} />
            ) : (
              <Users size={WANT_ICON} color={palette.foreground} />
            )}
          </View>
          <Text style={{ flex: 1 }}>{card.want}</Text>
        </View>
        <Text size="eyebrow" tone="muted" style={{ marginTop: 4 }}>
          {card.context}
        </Text>
        {card.note ? (
          <Text size="eyebrow" style={{ marginTop: 4 }}>
            {card.note}
          </Text>
        ) : null}
      </View>
    </>
  );

  return (
    <View style={{ padding: 16, gap: 13 }}>
      {open ? (
        <Pressable
          accessibilityRole="button"
          accessibilityHint={open.hint}
          onPress={open.onPress}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          {identity}
        </Pressable>
      ) : (
        <View
          style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}
        >
          {identity}
        </View>
      )}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label={m.requests.approve}
            accessibilityLabel={m.requests.approveName(card.name)}
            onPress={() => onAnswer("approve")}
          />
        </View>
        <Button
          label={m.requests.decline}
          accessibilityLabel={m.requests.declineName(card.name)}
          variant="outline"
          onPress={() => onAnswer("decline")}
        />
      </View>
      {extra}
    </View>
  );
}

/** The line an answer leaves behind, with Undo until it is sent. */
export function RequestDoneLine({
  request,
  decision,
  canUndo,
  onUndo,
}: {
  request: WaitingRequest;
  decision: RequestDecision;
  canUndo: boolean;
  onUndo: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const palette = useTonePalette();
  const { name } = waitingRequestCard(request, locale);
  const Icon = decision === "approve" ? Check : X;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: DONE_BOX,
          height: DONE_BOX,
          borderRadius: radii.sm,
          backgroundColor: palette.wash,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={DONE_ICON} color={palette.foreground} />
      </View>
      <Text size="meta" style={{ flex: 1, minWidth: 0 }}>
        <Text size="meta" weight="semibold">
          {name}
        </Text>{" "}
        <Text size="meta" tone="muted">
          {waitingRequestDoneText(request, decision, locale)}
        </Text>
      </Text>
      {canUndo ? (
        <TextAction
          label={m.requests.undo}
          accessibilityLabel={m.requests.undoName(name)}
          onPress={onUndo}
        />
      ) : null}
    </View>
  );
}

export function TextAction({
  label,
  accessibilityLabel,
  onPress,
}: {
  label: string;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      hitSlop={UNDO_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.iconAction + 12,
        justifyContent: "center",
        paddingStart: 8,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text size="meta" weight="semibold">
        {label}
      </Text>
    </Pressable>
  );
}

/** One row of a request list: the card while it waits, the done line once answered. */
export function RequestRowItem({
  row,
  now,
  open,
  cardExtra,
}: {
  row: RequestRow;
  now: Date;
  open?: RequestOpen;
  cardExtra?: React.ReactNode;
}) {
  const answers = useRequestAnswers();
  if (row.answer) {
    return (
      <RequestDoneLine
        request={row.request}
        decision={row.answer.decision}
        canUndo={answers.canUndo(row)}
        onUndo={() => answers.undo(row.request.id)}
      />
    );
  }
  return (
    <RequestCard
      request={row.request}
      now={now}
      open={open}
      extra={cardExtra}
      onAnswer={(decision) => answers.answer(row.request, decision)}
    />
  );
}

/** Requests in one hairline-bordered surface, divided by hairlines. */
export function RequestList({
  rows,
  now,
  footer,
}: {
  rows: readonly RequestRow[];
  now: Date;
  footer?: React.ReactNode;
}) {
  return (
    <Surface padded={false} radius="card" style={{ overflow: "hidden" }}>
      {rows.map((row, index) => (
        <Fragment key={row.request.id}>
          {index > 0 ? <Hairline /> : null}
          <RequestRowItem row={row} now={now} />
        </Fragment>
      ))}
      {footer ? (
        <>
          <Hairline />
          {footer}
        </>
      ) : null}
    </Surface>
  );
}

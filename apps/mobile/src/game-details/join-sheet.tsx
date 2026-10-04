import { sizes } from "@repo/design-tokens";
import {
  friendlyGameJoinSheetCaption,
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "@repo/domain/friendly-game-cta";
import {
  JOIN_ALONE_COPY,
  JOIN_WITH_PARTNER_COPY,
  PARTNER_PICKER_COPY,
  PARTNER_REVIEW_COPY,
  friendlyGameJoinOpeningStep,
  friendlyGameJoinSheetHeader,
  firstFullyVacantSideIndex,
  partnerContinueLabel,
  partnerPlayerMeta,
  partnerReviewDetails,
  partnerReviewGameLine,
  partnerSeatsChip,
  partnerSuggestionButtonLabel,
  partnerSuggestionMetaLine,
  seedPartnerCallerPosition,
  type PartnerSuggestion,
} from "@repo/domain/friendly-game-partner";
import { JOIN_GAME_ACTION } from "@repo/domain/game-copy";
import { formatGameSideLabel } from "@repo/domain/game-side-label";
import type { LevelBand } from "@repo/domain/level-bands";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hatch } from "../primitives/hatch";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import type { Slot } from "../home/home-model";
import {
  UNTOUCHED_SELECTION,
  pickedSeat,
  togglePickedSeat,
  type SeatSelection,
} from "./details-model";

const SHEET_MAX_HEIGHT = 560;

type Position = "left" | "right";

type SheetOccupant = {
  name: string;
  image: string | null;
  levelBand: LevelBand | null;
};

export type JoinSheetSide = {
  sideIndex: number;
  left: SheetOccupant | null;
  right: SheetOccupant | null;
};

export type PartnerPick = {
  id: string;
  name: string;
  image: string | null;
  levelBand: LevelBand | null;
  preferredPosition: Position | null;
};

export type PartnerSuggestions = {
  playedWithBefore: PartnerSuggestion[];
  fromYourGroups: PartnerSuggestion[];
};

export type JoinSheetGame = {
  title: string;
  sides: JoinSheetSide[];
  pricePerPlayerFils: number | null;
  windowStart: Date | null;
  venueName: string | null;
  isOrganizer: boolean;
  levelMinTenths: number | null;
  levelMaxTenths: number | null;
  offersPartner: boolean;
  partnerRequired?: boolean;
};

type Step = "chooser" | "seat" | "partner" | "review";

export type JoinSheetProps = {
  visible: boolean;
  initialSeat?: FriendlyGameJoinSeat | null;
  onClose: () => void;
  game: JoinSheetGame;
  preferredPosition: string | null;
  seatPending: boolean;
  partnerPending: boolean;
  error: string | null;
  suggestions: Slot<PartnerSuggestions>;
  searchResults: Slot<{ id: string; name: string }[]>;
  query: string;
  onQueryChange: (query: string) => void;
  onJoinSeat: (seat: FriendlyGameJoinSeat) => void;
  onRegisterWithPartner: (input: {
    partner: PartnerPick;
    sideIndex: number;
    position: Position;
  }) => void;
};

function Option({
  title,
  description,
  note,
  accessibleName,
  onPress,
}: {
  title: string;
  description: string;
  note: string;
  accessibleName: string;
  onPress: () => void;
}) {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibleName}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        padding: 16,
        gap: 4,
        borderRadius: 12,
        borderWidth: hairline,
        borderColor: palette.rule,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text weight="semibold">{title}</Text>
      <Text size="meta" tone="muted">
        {description}
      </Text>
      <Text size="meta" weight="medium">
        {note}
      </Text>
    </Pressable>
  );
}

function SeatTile({
  occupant,
  caption,
  label,
  selected,
  disabled,
  onPress,
}: {
  occupant: SheetOccupant | null;
  caption: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const palette = useTonePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 72,
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        borderRadius: 10,
        borderWidth: selected ? 2 : hairline,
        borderColor: selected ? palette.foreground : palette.rule,
        backgroundColor: occupant ? palette.wash : undefined,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {occupant ? null : <Hatch radius={10} bordered={false} />}
      {occupant ? (
        <Avatar name={occupant.name} uri={occupant.image} size="sm" />
      ) : null}
      <Text
        size="eyebrow"
        weight="medium"
        numberOfLines={1}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {occupant ? occupant.name : caption}
      </Text>
    </Pressable>
  );
}

function SeatStep({
  game,
  picked,
  pending,
  onPick,
  onConfirm,
}: {
  game: JoinSheetGame;
  picked: FriendlyGameJoinSeat | null;
  pending: boolean;
  onPick: (seat: FriendlyGameJoinSeat) => void;
  onConfirm: () => void;
}) {
  const priceLabel = formatPricePerPlayerFils(game.pricePerPlayerFils);
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {game.sides.map((side) => {
          const sideLabel = formatGameSideLabel(
            "friendly_game",
            side.sideIndex,
          );
          return (
            <View key={side.sideIndex} style={{ flex: 1, gap: 6 }}>
              <Text size="eyebrow" weight="medium" tone="muted" uppercase>
                {sideLabel}
              </Text>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {(["left", "right"] as const).map((position) => {
                  const occupant = side[position];
                  const seatName = `${sideLabel} ${position}`;
                  return (
                    <SeatTile
                      key={position}
                      occupant={occupant}
                      caption={position === "left" ? "Left" : "Right"}
                      label={
                        occupant
                          ? `${seatName}, taken by ${occupant.name}`
                          : `Take ${seatName}`
                      }
                      selected={
                        picked?.sideIndex === side.sideIndex &&
                        picked.position === position
                      }
                      disabled={occupant != null || pending}
                      onPress={() =>
                        onPick({ sideIndex: side.sideIndex, position })
                      }
                    />
                  );
                })}
              </View>
            </View>
          );
        })}
      </View>
      <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
        {friendlyGameJoinSheetCaption(game.sides, picked)}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        {priceLabel ? (
          <View>
            <Text size="lead" weight="bold" width="expanded">
              {priceLabel}
            </Text>
            <Text size="eyebrow" tone="muted">
              per player
            </Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button
            label={JOIN_GAME_ACTION}
            size="lg"
            disabled={!picked}
            pending={pending}
            onPress={onConfirm}
          />
        </View>
      </View>
    </View>
  );
}

function PartnerRow({
  row,
  selected,
  onPress,
}: {
  row: PartnerSuggestion;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = useTonePalette();
  const blocked = row.ineligible != null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={partnerSuggestionButtonLabel(row)}
      accessibilityState={{ disabled: blocked, selected }}
      disabled={blocked}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget + 8,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: 10,
        borderWidth: selected ? 2 : hairline,
        borderColor: selected ? palette.foreground : palette.rule,
        opacity: blocked ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <Avatar name={row.name} uri={row.image} size="default" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text weight={selected ? "semibold" : "medium"} numberOfLines={1}>
          {row.name}
        </Text>
        <Text size="meta" tone="muted">
          {partnerSuggestionMetaLine(row)}
        </Text>
      </View>
    </Pressable>
  );
}

function SuggestionGroup({
  title,
  rows,
  selectedId,
  onPick,
}: {
  title: string;
  rows: PartnerSuggestion[];
  selectedId: string | null;
  onPick: (row: PartnerSuggestion) => void;
}) {
  if (rows.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: 8 }}>
      <Text size="title" weight="semibold" accessibilityRole="header">
        {title}
      </Text>
      {rows.map((row) => (
        <PartnerRow
          key={row.id}
          row={row}
          selected={selectedId === row.id}
          onPress={() => onPick(row)}
        />
      ))}
    </View>
  );
}

function PartnerStep({
  vacantSeatCount,
  suggestions,
  searchResults,
  query,
  selected,
  onQueryChange,
  onSelect,
  onContinue,
}: {
  vacantSeatCount: number;
  suggestions: Slot<PartnerSuggestions>;
  searchResults: Slot<{ id: string; name: string }[]>;
  query: string;
  selected: PartnerPick | null;
  onQueryChange: (query: string) => void;
  onSelect: (partner: PartnerPick | null) => void;
  onContinue: () => void;
}) {
  const results = searchResults.status === "ready" ? searchResults.value : [];
  return (
    <View style={{ gap: 16 }}>
      <Text size="meta" tone="muted">
        {PARTNER_PICKER_COPY.description} {partnerSeatsChip(vacantSeatCount)}.
      </Text>
      <View style={{ gap: 16 }}>
        <View style={{ gap: 16 }}>
          {suggestions.status === "error" ? (
            <Text size="meta" accessibilityRole="alert">
              {suggestions.message}
            </Text>
          ) : null}
          {suggestions.status === "ready" ? (
            <>
              <SuggestionGroup
                title="Played with before"
                rows={suggestions.value.playedWithBefore}
                selectedId={selected?.id ?? null}
                onPick={(row) => onSelect(pickFromSuggestion(row))}
              />
              <SuggestionGroup
                title="From your groups"
                rows={suggestions.value.fromYourGroups}
                selectedId={selected?.id ?? null}
                onPick={(row) => onSelect(pickFromSuggestion(row))}
              />
            </>
          ) : null}
          <TextField
            label="Search"
            placeholder="Search Users"
            value={query}
            onChangeText={onQueryChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchResults.status === "error" ? (
            <Text size="meta" accessibilityRole="alert">
              {searchResults.message}
            </Text>
          ) : null}
          {query.trim() !== "" &&
          searchResults.status === "ready" &&
          results.length === 0 ? (
            <Text size="meta" tone="muted">
              No Users found
            </Text>
          ) : null}
          {query.trim() !== ""
            ? results.map((row) => (
                <Button
                  key={row.id}
                  label={row.name}
                  variant="outline"
                  selected={selected?.id === row.id}
                  onPress={() =>
                    onSelect({
                      id: row.id,
                      name: row.name,
                      image: null,
                      levelBand: null,
                      preferredPosition: null,
                    })
                  }
                />
              ))
            : null}
        </View>
      </View>
      <Button
        label={partnerContinueLabel(selected?.name ?? null)}
        size="lg"
        disabled={!selected}
        onPress={onContinue}
      />
      <Text size="eyebrow" tone="muted">
        {PARTNER_PICKER_COPY.footnote}
      </Text>
    </View>
  );
}

function pickFromSuggestion(row: PartnerSuggestion): PartnerPick {
  return {
    id: row.id,
    name: row.name,
    image: row.image,
    levelBand: row.levelBand,
    preferredPosition: row.preferredPosition,
  };
}

function ReviewStep({
  game,
  partner,
  preferredPosition,
  pending,
  error,
  onRegister,
}: {
  game: JoinSheetGame;
  partner: PartnerPick;
  preferredPosition: string | null;
  pending: boolean;
  error: string | null;
  onRegister: (position: Position) => void;
}) {
  const palette = useTonePalette();
  const [touched, setTouched] = useState(false);
  const [caller, setCaller] = useState<Position>(() =>
    seedPartnerCallerPosition({
      viewerPreferred: preferredPosition,
      partnerPreferred: partner.preferredPosition,
    }),
  );
  useEffect(() => {
    if (!touched) {
      setCaller(
        seedPartnerCallerPosition({
          viewerPreferred: preferredPosition,
          partnerPreferred: partner.preferredPosition,
        }),
      );
    }
  }, [touched, preferredPosition, partner.preferredPosition]);

  const partnerPosition: Position = caller === "left" ? "right" : "left";
  const details = partnerReviewDetails({
    isOrganizer: game.isOrganizer,
    pricePerPlayerFils: game.pricePerPlayerFils,
    levelMinTenths: game.levelMinTenths,
    levelMaxTenths: game.levelMaxTenths,
  });

  function choose(position: Position) {
    setTouched(true);
    setCaller(position);
  }

  return (
    <View style={{ gap: 16 }}>
      <Text size="meta" tone="muted">
        {partnerReviewGameLine({
          windowStart: game.windowStart,
          venueName: game.venueName,
        })}
      </Text>
      {error ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={{ gap: 8 }}>
        <Text size="title" weight="semibold" accessibilityRole="header">
          {PARTNER_REVIEW_COPY.yourTeam}
        </Text>
        <View
          accessible
          accessibilityLabel={`You, ${partnerPlayerMeta({ levelBand: null, position: caller })}`}
          style={{ gap: 2 }}
        >
          <Text weight="semibold">You</Text>
          <Text size="meta" tone="muted">
            {partnerPlayerMeta({ levelBand: null, position: caller })}
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel={`${partner.name}, ${partnerPlayerMeta({ levelBand: partner.levelBand, position: partnerPosition })}`}
          style={{ gap: 2 }}
        >
          <Text weight="semibold">{partner.name}</Text>
          <Text size="meta" tone="muted">
            {partnerPlayerMeta({
              levelBand: partner.levelBand,
              position: partnerPosition,
            })}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            label={PARTNER_REVIEW_COPY.keepSides}
            variant={caller === "left" ? "default" : "outline"}
            selected={caller === "left"}
            onPress={() => choose("left")}
          />
          <Button
            label={PARTNER_REVIEW_COPY.swapSides}
            variant={caller === "right" ? "default" : "outline"}
            selected={caller === "right"}
            onPress={() => choose("right")}
          />
        </View>
      </View>
      <View
        style={{
          borderRadius: 12,
          borderWidth: hairline,
          borderColor: palette.rule,
        }}
      >
        {details.map((row, index) => (
          <View
            key={row.label}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
              padding: 14,
              borderTopWidth: index > 0 ? hairline : 0,
              borderTopColor: palette.rule,
            }}
          >
            <Text tone="muted">{row.label}</Text>
            <Text style={{ flexShrink: 1, textAlign: "right" }}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>
      <Button
        label={PARTNER_REVIEW_COPY.register}
        size="lg"
        pending={pending}
        onPress={() => onRegister(caller)}
      />
      <Text size="eyebrow" tone="muted">
        {PARTNER_REVIEW_COPY.footnote}
      </Text>
    </View>
  );
}

export function JoinSheet(props: JoinSheetProps) {
  const { visible, game, preferredPosition } = props;
  const [step, setStep] = useState<Step>("seat");
  const [selection, setSelection] =
    useState<SeatSelection>(UNTOUCHED_SELECTION);
  const [partner, setPartner] = useState<PartnerPick | null>(null);

  useEffect(() => {
    if (visible) {
      setSelection(
        props.initialSeat
          ? { touched: true, seat: props.initialSeat }
          : UNTOUCHED_SELECTION,
      );
      setPartner(null);
      setStep(
        game.partnerRequired
          ? "partner"
          : friendlyGameJoinOpeningStep({
              offersPartner: game.offersPartner,
              hasInitialSeat: Boolean(props.initialSeat),
            }),
      );
    }
    // Reset only when the sheet opens; the Game may change while it is open.
  }, [visible]);

  const picked = pickedSeat(selection, game.sides, preferredPosition);
  const isFull = vacantJoinSeats(game.sides).length === 0;
  const header = friendlyGameJoinSheetHeader({
    step: step === "chooser" ? "chooser" : "seat",
    isFull,
    title: game.title,
  });
  const title =
    step === "partner"
      ? PARTNER_PICKER_COPY.title
      : step === "review"
        ? PARTNER_REVIEW_COPY.title
        : header.title;
  const vacantSideIndex = firstFullyVacantSideIndex(game.sides);

  return (
    <Sheet visible={visible} onClose={props.onClose} title={title}>
      <ScrollView
        style={{ maxHeight: SHEET_MAX_HEIGHT }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16 }}
      >
        {step === "chooser" || step === "seat" ? (
          <Text size="meta" tone="muted">
            {header.description}
          </Text>
        ) : null}
        {props.error && step !== "review" ? (
          <Text size="meta" weight="medium" accessibilityRole="alert">
            {props.error}
          </Text>
        ) : null}
        {step === "chooser" ? (
          <View style={{ gap: 12 }}>
            <Option
              {...JOIN_ALONE_COPY}
              onPress={() => {
                setSelection({ touched: true, seat: null });
                setStep("seat");
              }}
            />
            <Option
              {...JOIN_WITH_PARTNER_COPY}
              onPress={() => setStep("partner")}
            />
          </View>
        ) : null}
        {step === "seat" ? (
          <>
            <SeatStep
              game={game}
              picked={picked}
              pending={props.seatPending}
              onPick={(seat) => setSelection(togglePickedSeat(picked, seat))}
              onConfirm={() => picked && props.onJoinSeat(picked)}
            />
            {game.offersPartner ? (
              <Button
                label={JOIN_WITH_PARTNER_COPY.title}
                variant="outline"
                onPress={() => setStep("partner")}
              />
            ) : null}
          </>
        ) : null}
        {step === "partner" ? (
          <PartnerStep
            vacantSeatCount={vacantJoinSeats(game.sides).length}
            suggestions={props.suggestions}
            searchResults={props.searchResults}
            query={props.query}
            selected={partner}
            onQueryChange={props.onQueryChange}
            onSelect={setPartner}
            onContinue={() => setStep("review")}
          />
        ) : null}
        {step === "review" && partner ? (
          <>
            <ReviewStep
              game={game}
              partner={partner}
              preferredPosition={preferredPosition}
              pending={props.partnerPending}
              error={props.error}
              onRegister={(position) =>
                vacantSideIndex != null &&
                props.onRegisterWithPartner({
                  partner,
                  sideIndex: vacantSideIndex,
                  position,
                })
              }
            />
            <Button
              label="Back"
              variant="outline"
              onPress={() => setStep("partner")}
            />
          </>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

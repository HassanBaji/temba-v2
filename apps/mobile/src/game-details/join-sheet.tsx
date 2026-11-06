import { sizes } from "@repo/design-tokens";
import {
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "@repo/domain/friendly-game-cta";
import { formatGameCardDay } from "@repo/domain/format-game-start";
import { formatHomeKickoff } from "@repo/domain/home-countdown";
import {
  joinSeatSummary,
  joinSideHelp,
  joinSideOptions,
  joinTeamCta,
  joinTeamOptions,
  sidePickerHint,
  type SideChoice,
} from "@repo/domain/padel-sides";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import {
  friendlyGameJoinOpeningStep,
  friendlyGameJoinSheetHeader,
  firstFullyVacantSideIndex,
  joinAloneCopy,
  joinWithPartnerCopy,
  partnerContinueLabel,
  partnerPickerCopy,
  partnerPlayerMeta,
  partnerReviewCopy,
  partnerReviewDetails,
  partnerReviewGameLine,
  partnerSeatsChip,
  partnerSuggestionButtonLabel,
  partnerSuggestionMetaLine,
  seedPartnerCallerPosition,
  type PartnerSuggestion,
} from "@repo/domain/friendly-game-partner";
import { joinGameAction } from "@repo/domain/game-copy";
import type { LevelBand } from "@repo/domain/level-bands";
import { formatPricePerPlayerFils } from "@repo/domain/price-per-player";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { useTonePalette } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import type { Slot } from "../home/home-model";
import {
  EMPTY_JOIN_SELECTION,
  resolveJoinPick,
  type JoinPick,
  type JoinSelection,
} from "./details-model";
import { SidePicker, SummaryRows, TeamPicker } from "./side-picker";

const SHEET_MAX_HEIGHT = 560;

type Position = "left" | "right";

type SheetOccupant = {
  userId: string;
  name: string;
  image: string | null;
  levelBand: LevelBand | null;
  eitherSide?: boolean;
  sideSetByUserId?: string | null;
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
  /** Friendly games take Either; tournaments need a Position. */
  sidesOptional: boolean;
  preferredPosition: string | null;
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
  onJoinSeat: (seat: JoinPick) => void;
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

function joinSummaryLine(game: JoinSheetGame, locale: Locale) {
  const m = messagesFor(locale);
  const start = game.windowStart;
  const kickoff = start ? formatHomeKickoff(start, locale) : null;
  const when =
    start && kickoff
      ? m.game.partner.whenLine(
          formatGameCardDay(start, locale),
          kickoff.time,
          kickoff.meridiem === "" ? null : kickoff.meridiem,
        )
      : null;
  const venue = game.venueName?.trim() ? game.venueName.trim() : null;
  const price = formatPricePerPlayerFils(game.pricePerPlayerFils, locale);
  if (!when || !venue) {
    return game.title;
  }
  return m.game.sides.joinSummary(when, venue, price);
}

function SeatStep({
  game,
  selection,
  picked,
  pending,
  onSelectTeam,
  onSelectSide,
  onConfirm,
}: {
  game: JoinSheetGame;
  selection: JoinSelection;
  picked: JoinPick | null;
  pending: boolean;
  onSelectTeam: (sideIndex: number) => void;
  onSelectSide: (side: SideChoice) => void;
  onConfirm: () => void;
}) {
  const m = useMessages();
  const copy = m.game.sides;
  const locale = useLocale();
  const priceLabel = formatPricePerPlayerFils(game.pricePerPlayerFils, locale);
  const teams = joinTeamOptions(game.sides, locale).filter((row) => row.open);
  const team =
    game.sides.find((row) => row.sideIndex === picked?.sideIndex) ?? null;
  const sideOptions = joinSideOptions(team, locale).filter(
    (option) => game.sidesOptional || option.side !== "either",
  );
  const summaryRows = picked
    ? [
        {
          label: copy.yourSeat,
          value: joinSeatSummary(picked.sideIndex, picked.position, locale),
        },
        ...(priceLabel
          ? [{ label: copy.courtCost, value: copy.courtCostValue(priceLabel) }]
          : []),
      ]
    : [];
  return (
    <View style={{ gap: 16 }}>
      <Text size="meta" tone="muted">
        {joinSummaryLine(game, locale)}
      </Text>
      <View style={{ gap: 8 }}>
        <Text size="meta" tone="muted">
          {copy.teamHeading}
        </Text>
        <TeamPicker
          options={teams}
          selected={picked?.sideIndex ?? selection.team}
          onSelect={onSelectTeam}
        />
      </View>
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 12,
          }}
        >
          <Text size="meta" tone="muted">
            {copy.sideHeading}
          </Text>
          {game.sidesOptional ? (
            <Text size="eyebrow" tone="muted" numberOfLines={1}>
              {sidePickerHint(game.preferredPosition, locale)}
            </Text>
          ) : null}
        </View>
        <SidePicker
          options={sideOptions}
          selected={picked?.position ?? null}
          onSelect={onSelectSide}
        />
        {picked && game.sidesOptional ? (
          <Text size="meta" tone="muted" accessibilityLiveRegion="polite">
            {joinSideHelp(team, picked.position, locale)}
          </Text>
        ) : null}
      </View>
      {summaryRows.length > 0 ? <SummaryRows rows={summaryRows} /> : null}
      <Button
        label={
          picked
            ? joinTeamCta(picked.sideIndex, picked.position, locale)
            : joinGameAction(locale)
        }
        size="lg"
        disabled={!picked}
        pending={pending}
        onPress={onConfirm}
      />
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
  const locale = useLocale();
  const palette = useTonePalette();
  const blocked = row.ineligible != null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={partnerSuggestionButtonLabel(row, locale)}
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
          {partnerSuggestionMetaLine(row, locale)}
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
  const m = useMessages();
  const copy = m.mobileGameDetails.join;
  const locale = useLocale();
  const pickerCopy = partnerPickerCopy(locale);
  const results = searchResults.status === "ready" ? searchResults.value : [];
  return (
    <View style={{ gap: 16 }}>
      <Text size="meta" tone="muted">
        {copy.partnerPickerLine(
          pickerCopy.description,
          partnerSeatsChip(vacantSeatCount, locale),
        )}
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
                title={copy.playedWithBefore}
                rows={suggestions.value.playedWithBefore}
                selectedId={selected?.id ?? null}
                onPick={(row) => onSelect(pickFromSuggestion(row))}
              />
              <SuggestionGroup
                title={copy.fromYourGroups}
                rows={suggestions.value.fromYourGroups}
                selectedId={selected?.id ?? null}
                onPick={(row) => onSelect(pickFromSuggestion(row))}
              />
            </>
          ) : null}
          <TextField
            label={m.common.search}
            placeholder={copy.searchPlaceholder}
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
              {copy.noUsersFound}
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
        label={partnerContinueLabel(selected?.name ?? null, locale)}
        size="lg"
        disabled={!selected}
        onPress={onContinue}
      />
      <Text size="eyebrow" tone="muted">
        {pickerCopy.footnote}
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
  const m = useMessages();
  const copy = m.mobileGameDetails.join;
  const locale = useLocale();
  const reviewCopy = partnerReviewCopy(locale);
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
    locale,
  });

  const callerMeta = partnerPlayerMeta({
    levelBand: null,
    position: caller,
    locale,
  });
  const partnerMeta = partnerPlayerMeta({
    levelBand: partner.levelBand,
    position: partnerPosition,
    locale,
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
          locale,
        })}
      </Text>
      {error ? (
        <Text size="meta" weight="medium" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={{ gap: 8 }}>
        <Text size="title" weight="semibold" accessibilityRole="header">
          {reviewCopy.yourTeam}
        </Text>
        <View
          accessible
          accessibilityLabel={copy.youWithMeta(callerMeta)}
          style={{ gap: 2 }}
        >
          <Text weight="semibold">{m.common.you}</Text>
          <Text size="meta" tone="muted">
            {callerMeta}
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel={copy.nameWithMeta(partner.name, partnerMeta)}
          style={{ gap: 2 }}
        >
          <Text weight="semibold">{partner.name}</Text>
          <Text size="meta" tone="muted">
            {partnerMeta}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            label={reviewCopy.keepSides}
            variant={caller === "left" ? "default" : "outline"}
            selected={caller === "left"}
            onPress={() => choose("left")}
          />
          <Button
            label={reviewCopy.swapSides}
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
        label={reviewCopy.register}
        size="lg"
        pending={pending}
        onPress={() => onRegister(caller)}
      />
      <Text size="eyebrow" tone="muted">
        {reviewCopy.footnote}
      </Text>
    </View>
  );
}

export function JoinSheet(props: JoinSheetProps) {
  const { visible, game, preferredPosition } = props;
  const m = useMessages();
  const locale = useLocale();
  const [step, setStep] = useState<Step>("seat");
  const [selection, setSelection] =
    useState<JoinSelection>(EMPTY_JOIN_SELECTION);
  const [partner, setPartner] = useState<PartnerPick | null>(null);

  useEffect(() => {
    if (visible) {
      setSelection(
        props.initialSeat
          ? {
              team: props.initialSeat.sideIndex,
              // A tapped Friendly seat names its team; the side stays optional.
              side: game.sidesOptional ? null : props.initialSeat.position,
            }
          : EMPTY_JOIN_SELECTION,
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

  const picked = resolveJoinPick(
    selection,
    game.sides,
    preferredPosition,
    game.sidesOptional,
  );
  const isFull = vacantJoinSeats(game.sides).length === 0;
  const header = friendlyGameJoinSheetHeader({
    step: step === "chooser" ? "chooser" : "seat",
    isFull,
    title: game.title,
    locale,
  });
  const title =
    step === "partner"
      ? partnerPickerCopy(locale).title
      : step === "review"
        ? partnerReviewCopy(locale).title
        : step === "seat" && !isFull
          ? m.game.sides.joinTitle
          : header.title;
  const vacantSideIndex = firstFullyVacantSideIndex(game.sides);

  return (
    <Sheet visible={visible} onClose={props.onClose} title={title}>
      <ScrollView
        style={{ maxHeight: SHEET_MAX_HEIGHT }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: 16 }}
      >
        {step === "chooser" || (step === "seat" && isFull) ? (
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
              {...joinAloneCopy(locale)}
              onPress={() => {
                setSelection(EMPTY_JOIN_SELECTION);
                setStep("seat");
              }}
            />
            <Option
              {...joinWithPartnerCopy(locale)}
              onPress={() => setStep("partner")}
            />
          </View>
        ) : null}
        {step === "seat" ? (
          <>
            <SeatStep
              game={game}
              selection={selection}
              picked={picked}
              pending={props.seatPending}
              onSelectTeam={(team) =>
                setSelection((current) => ({ ...current, team }))
              }
              onSelectSide={(side) =>
                setSelection((current) => ({ ...current, side }))
              }
              onConfirm={() => picked && props.onJoinSeat(picked)}
            />
            {game.offersPartner ? (
              <Button
                label={joinWithPartnerCopy(locale).title}
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
              label={m.common.back}
              variant="outline"
              onPress={() => setStep("partner")}
            />
          </>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

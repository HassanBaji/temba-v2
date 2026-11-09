import { radii, sizes, spacing } from "@repo/design-tokens";
import {
  ACCEPT_SLOT_PREVIEW,
  acceptCourts,
  acceptDraftForTeam,
  acceptDraftHasExtras,
  acceptPickCourt,
  acceptPickSlot,
  acceptPickVenue,
  acceptProposeLabel,
  acceptSlotCells,
  acceptTeamCards,
  acceptTimeHint,
  acceptToldLine,
  acceptVenueIsElsewhere,
  acceptVenueRows,
  initialAcceptDraft,
  validateAcceptDraft,
  type AcceptDraft,
  type AcceptDraftField,
} from "@repo/domain/challenge-accept";
import { Fragment, useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { ChipGrid, FieldError } from "../create-game/chips";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { useColors } from "../theme/theme-provider";
import { api } from "../trpc/react";
import { CrestTile } from "./challenge-detail-parts";

const GRID_GAP = 8;
const TIME_COLUMNS = 3;
const TEAM_COLUMNS = 2;
const CELL_HEIGHT = 52;
const RADIO = 20;
const RADIO_DOT = 7;
const NESTED_INSET = 48;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

function BlockHeader({ label, hint }: { label: string; hint?: string | null }) {
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
      <Text size="meta" tone="muted" accessibilityRole="header">
        {label}
      </Text>
      {hint ? (
        <Text
          size="eyebrow"
          tone="muted"
          style={{ flexShrink: 1, textAlign: "right" }}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function GridRow<T>({
  items,
  columns,
  render,
}: {
  items: readonly T[];
  columns: number;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <View style={{ flexDirection: "row", gap: GRID_GAP }}>
      {items.map((item, index) => (
        <View key={index} style={{ flex: 1 }}>
          {render(item)}
        </View>
      ))}
      {Array.from({ length: columns - items.length }, (_, index) => (
        <View key={`spacer-${index}`} style={{ flex: 1 }} />
      ))}
    </View>
  );
}

function ChoiceTile({
  selected,
  accessibilityLabel,
  onPress,
  style,
  children,
}: {
  selected: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  style?: object;
  children: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <SurfaceToneContext.Provider value={selected ? "ink" : "paper"}>
      <Pressable
        accessibilityRole="radio"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked: selected }}
        onPress={onPress}
        style={({ pressed }) => [
          {
            borderWidth: hairline,
            borderRadius: radii.lg,
            borderColor: selected ? colors.controlEdge : colors.rule,
            backgroundColor: selected
              ? colors.control
              : pressed
                ? colors.wash
                : colors.paper,
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    </SurfaceToneContext.Provider>
  );
}

function RadioDot({ checked }: { checked: boolean }) {
  const colors = useColors();
  return (
    <View
      style={{
        width: RADIO,
        height: RADIO,
        borderRadius: RADIO / 2,
        borderWidth: hairline,
        borderColor: checked ? colors.controlEdge : colors.inputBorder,
        backgroundColor: checked ? colors.control : colors.paper,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked ? (
        <View
          style={{
            width: RADIO_DOT,
            height: RADIO_DOT,
            borderRadius: RADIO_DOT / 2,
            backgroundColor: colors.onControl,
          }}
        />
      ) : null}
    </View>
  );
}

function VenueRow({
  label,
  hint,
  checked,
  nested = false,
  onPress,
}: {
  label: string;
  hint: string | null;
  checked: boolean;
  nested?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: CELL_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        paddingStart: nested ? NESTED_INSET : 16,
        backgroundColor: checked || pressed ? colors.wash : colors.paper,
      })}
    >
      <RadioDot checked={checked} />
      <Text style={{ flex: 1 }}>{label}</Text>
      {hint ? (
        <Text size="eyebrow" tone="muted">
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: sizes.touchTarget,
        justifyContent: "center",
        alignSelf: "flex-start",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Text size="meta" weight="semibold">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * 2b: pick the Team, a Venue (their preferred first, the rest behind
 * Somewhere else) and a time, then propose. A Court and a price each are
 * optional, behind one line. A Team with a pending Proposal here opens on
 * its terms and the send changes it.
 */
export function AcceptSheet({
  challengeId,
  visible,
  teamId,
  onClose,
}: {
  challengeId: string;
  visible: boolean;
  /** The Team whose pending Proposal to change; the first eligible Team otherwise. */
  teamId?: string | null;
  onClose: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const toast = useToast();
  const colors = useColors();
  const utils = api.useUtils();
  const copy = m.challenge.accept;
  const screen = m.challenge.detailScreen.accept;
  const options = api.challenges.listProposeOptions.useQuery(
    { challengeId },
    { enabled: visible },
  );
  const [draft, setDraft] = useState<AcceptDraft | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<AcceptDraftField, string>>
  >({});
  const [elsewhere, setElsewhere] = useState(false);
  const [allTimes, setAllTimes] = useState(false);
  const [extras, setExtras] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDraft(null);
      setErrors({});
      setElsewhere(false);
      setAllTimes(false);
      setExtras(false);
    } else if (options.data && !draft) {
      const initial = initialAcceptDraft(options.data, teamId);
      setDraft(initial);
      setElsewhere(acceptVenueIsElsewhere(options.data, initial.venueId));
      setExtras(acceptDraftHasExtras(initial));
    }
  }, [visible, options.data, draft, teamId]);

  const settle = async (message: string) => {
    toast.show(message);
    await Promise.all([
      utils.challenges.byId.invalidate({ id: challengeId }),
      utils.challenges.listProposeOptions.invalidate({ challengeId }),
      utils.challenges.listOpen.invalidate(),
      utils.challenges.listMine.invalidate(),
    ]);
    onClose();
  };
  const propose = api.challenges.propose.useMutation({
    onSuccess: () => settle(copy.sent),
    onError: (error) => toast.show(error.message),
  });
  const change = api.challenges.changeProposal.useMutation({
    onSuccess: () => settle(copy.changed),
    onError: (error) => toast.show(error.message),
  });

  const data = options.data;
  const pendingTeam = data?.teams.find(
    (team) => team.id === draft?.teamId && team.pendingProposal,
  );

  function submit() {
    if (!data || !draft) {
      return;
    }
    const result = validateAcceptDraft(draft, data, locale);
    if (!result.ok) {
      setErrors(result.errors);
      if (result.errors.price) {
        setExtras(true);
      }
      return;
    }
    setErrors({});
    if (result.proposalId) {
      change.mutate({
        proposalId: result.proposalId,
        venueId: result.value.venueId,
        courtId: result.value.courtId,
        startsAt: result.value.startsAt,
        pricePerPlayerFils: result.value.pricePerPlayerFils,
      });
    } else {
      propose.mutate({ challengeId, ...result.value });
    }
  }

  function pickTeam(id: string) {
    if (!data) {
      return;
    }
    const next = acceptDraftForTeam(data, id);
    setDraft(next);
    setElsewhere(acceptVenueIsElsewhere(data, next.venueId));
    setExtras(acceptDraftHasExtras(next));
  }

  const venues = data ? acceptVenueRows(data, locale) : null;
  const cells = data ? acceptSlotCells(data, locale) : [];
  const pickedIndex = cells.findIndex(
    (cell) => cell.value === draft?.startsAt?.getTime(),
  );
  const showAllTimes = allTimes || pickedIndex >= ACCEPT_SLOT_PREVIEW;
  const visibleCells = showAllTimes
    ? cells
    : cells.slice(0, ACCEPT_SLOT_PREVIEW);
  const courts = data && draft ? acceptCourts(data, draft.venueId) : [];
  const told =
    data && draft ? acceptToldLine(data, draft.teamId, locale) : null;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={pendingTeam ? copy.changeTitle : copy.title}
      subtitle={
        data ? screen.subtitle(data.posterTeam.displayName) : copy.description
      }
      closeButton
      tall
      keyboardShouldPersistTaps="handled"
      footer={
        data && draft && data.teams.length > 0 ? (
          <Button
            label={acceptProposeLabel(draft, data, locale)}
            size="lg"
            pending={propose.isPending || change.isPending}
            onPress={submit}
          />
        ) : null
      }
    >
      {options.isLoading || (data && !draft) ? (
        <Skeleton height={240} radius={16} />
      ) : options.error || !data || !draft || !venues ? (
        <Notice
          alert
          title={copy.errorTitle}
          description={options.error?.message ?? ""}
          onRetry={() => void options.refetch()}
        />
      ) : data.teams.length === 0 ? (
        <Text>{copy.noTeams}</Text>
      ) : (
        <View style={{ gap: 20 }}>
          <View>
            <BlockHeader label={copy.team} />
            <View accessibilityRole="radiogroup" style={{ gap: GRID_GAP }}>
              {chunk(acceptTeamCards(data, locale), TEAM_COLUMNS).map(
                (row, index) => (
                  <GridRow
                    key={index}
                    items={row}
                    columns={TEAM_COLUMNS}
                    render={(team) => {
                      const selected = team.value === draft.teamId;
                      return (
                        <ChoiceTile
                          selected={selected}
                          accessibilityLabel={team.accessibilityLabel}
                          onPress={() => pickTeam(team.value)}
                          style={{
                            minHeight: 64,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                            paddingVertical: 12,
                            paddingHorizontal: 14,
                          }}
                        >
                          <CrestTile
                            size="sm"
                            initials={team.initials}
                            inverted={selected}
                          />
                          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                            <Text weight="semibold">{team.title}</Text>
                            {team.line ? (
                              <Text size="eyebrow" tone="muted">
                                {team.line}
                              </Text>
                            ) : null}
                          </View>
                        </ChoiceTile>
                      );
                    }}
                  />
                ),
              )}
            </View>
            {told ? (
              <Text size="eyebrow" tone="muted" style={{ marginTop: 8 }}>
                {told}
              </Text>
            ) : null}
            <FieldError message={errors.team} />
          </View>

          <View>
            <BlockHeader label={copy.venue} hint={venues.hint} />
            <View
              accessibilityRole="radiogroup"
              style={{
                borderWidth: hairline,
                borderColor: colors.rule,
                borderRadius: radii.card,
                overflow: "hidden",
              }}
            >
              {venues.rows.map((venue, index) => (
                <Fragment key={venue.value}>
                  {index > 0 ? <Hairline /> : null}
                  <VenueRow
                    label={venue.label}
                    hint={venue.hint}
                    checked={!elsewhere && venue.value === draft.venueId}
                    onPress={() => {
                      setElsewhere(false);
                      setDraft(acceptPickVenue(draft, venue.value));
                    }}
                  />
                </Fragment>
              ))}
              {venues.elsewhere ? (
                <>
                  {venues.rows.length > 0 ? <Hairline /> : null}
                  <VenueRow
                    label={venues.elsewhere.label}
                    hint={venues.elsewhere.hint}
                    checked={elsewhere}
                    onPress={() => {
                      setElsewhere(true);
                      if (!acceptVenueIsElsewhere(data, draft.venueId)) {
                        setDraft({ ...draft, venueId: null, courtId: null });
                      }
                    }}
                  />
                  {elsewhere
                    ? venues.elsewhere.venues.map((venue) => (
                        <Fragment key={venue.value}>
                          <Hairline />
                          <VenueRow
                            nested
                            label={venue.label}
                            hint={null}
                            checked={venue.value === draft.venueId}
                            onPress={() =>
                              setDraft(acceptPickVenue(draft, venue.value))
                            }
                          />
                        </Fragment>
                      ))
                    : null}
                </>
              ) : null}
            </View>
            <FieldError message={errors.venue} />
          </View>

          <View>
            <BlockHeader
              label={copy.time}
              hint={acceptTimeHint(data, locale)}
            />
            {cells.length === 0 ? (
              <Text size="meta" tone="muted">
                {copy.noSlots}
              </Text>
            ) : (
              <View accessibilityRole="radiogroup" style={{ gap: GRID_GAP }}>
                {chunk(visibleCells, TIME_COLUMNS).map((row, index) => (
                  <GridRow
                    key={index}
                    items={row}
                    columns={TIME_COLUMNS}
                    render={(cell) => (
                      <ChoiceTile
                        selected={cell.value === draft.startsAt?.getTime()}
                        accessibilityLabel={cell.accessibilityLabel}
                        onPress={() =>
                          setDraft(acceptPickSlot(draft, data, cell.startsAt))
                        }
                        style={{
                          height: CELL_HEIGHT,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 2,
                        }}
                      >
                        <Text weight="semibold">{cell.time}</Text>
                        <Text size="eyebrow" tone="muted">
                          {cell.day}
                        </Text>
                      </ChoiceTile>
                    )}
                  />
                ))}
              </View>
            )}
            {!showAllTimes && cells.length > ACCEPT_SLOT_PREVIEW ? (
              <TextLink
                label={screen.moreTimes}
                onPress={() => setAllTimes(true)}
              />
            ) : null}
            <FieldError message={errors.slot} />
          </View>

          {extras ? (
            <View style={{ gap: spacing.compact }}>
              {courts.length > 0 ? (
                <View>
                  <BlockHeader label={copy.court} hint={copy.courtHint} />
                  <ChipGrid
                    label={copy.court}
                    chips={courts}
                    isSelected={(id) => id === draft.courtId}
                    onSelect={(id) => setDraft(acceptPickCourt(draft, id))}
                  />
                </View>
              ) : null}
              <View>
                <BlockHeader label={copy.price} hint={copy.priceHint} />
                <TextField
                  value={draft.price}
                  onChangeText={(price) => setDraft({ ...draft, price })}
                  placeholder={copy.pricePlaceholder}
                  keyboardType="decimal-pad"
                  accessibilityLabel={copy.price}
                  ltr
                />
                <FieldError message={errors.price} />
              </View>
            </View>
          ) : (
            <TextLink label={screen.extras} onPress={() => setExtras(true)} />
          )}
        </View>
      )}
    </Sheet>
  );
}

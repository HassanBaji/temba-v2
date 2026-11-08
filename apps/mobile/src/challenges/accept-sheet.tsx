import { spacing } from "@repo/design-tokens";
import {
  acceptCourts,
  acceptCtaLabel,
  acceptDraftForTeam,
  acceptPickCourt,
  acceptPickDay,
  acceptPickVenue,
  acceptSlotDays,
  acceptVenueChips,
  initialAcceptDraft,
  validateAcceptDraft,
  type AcceptDraft,
  type AcceptDraftField,
} from "@repo/domain/challenge-accept";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { ChipGrid, FieldError } from "../create-game/chips";
import { Notice } from "../groups/notice";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { Button } from "../primitives/button";
import { Sheet } from "../primitives/sheet";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";

function Field({
  title,
  hint,
  error,
  children,
}: {
  title: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text size="lead" weight="semibold">
        {title}
      </Text>
      {hint ? (
        <Text size="meta" tone="muted">
          {hint}
        </Text>
      ) : null}
      {children}
      <FieldError message={error} />
    </View>
  );
}

/**
 * 2b: pick the Team, a Venue (preferred first), a slot, and optionally a
 * Court and a price each, then send. A Team with a pending Proposal here
 * opens on its terms and the send changes it.
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
  const utils = api.useUtils();
  const copy = m.challenge.accept;
  const options = api.challenges.listProposeOptions.useQuery(
    { challengeId },
    { enabled: visible },
  );
  const [draft, setDraft] = useState<AcceptDraft | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<AcceptDraftField, string>>
  >({});

  useEffect(() => {
    if (!visible) {
      setDraft(null);
      setErrors({});
    } else if (options.data && !draft) {
      setDraft(initialAcceptDraft(options.data, teamId));
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

  const days = data ? acceptSlotDays(data, locale) : [];
  const day = days.find((candidate) => candidate.key === draft?.dayKey);
  const courts = data && draft ? acceptCourts(data, draft.venueId) : [];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={pendingTeam ? copy.changeTitle : copy.title}
      subtitle={copy.description}
      closeButton
      tall
      keyboardShouldPersistTaps="handled"
      footer={
        data && draft && data.teams.length > 0 ? (
          <View style={{ gap: 8 }}>
            <Button
              label={acceptCtaLabel(data, locale)}
              size="lg"
              pending={propose.isPending || change.isPending}
              onPress={submit}
            />
            <Text size="meta" tone="muted" style={{ textAlign: "center" }}>
              {copy.footer}
            </Text>
          </View>
        ) : null
      }
    >
      {options.isLoading || (data && !draft) ? (
        <Skeleton height={240} radius={16} />
      ) : options.error || !data || !draft ? (
        <Notice
          alert
          title={copy.errorTitle}
          description={options.error?.message ?? ""}
          onRetry={() => void options.refetch()}
        />
      ) : data.teams.length === 0 ? (
        <Text>{copy.noTeams}</Text>
      ) : (
        <View style={{ gap: spacing.section }}>
          <Field title={copy.team} error={errors.team}>
            <ChipGrid
              label={copy.team}
              chips={data.teams.map((team) => ({
                value: team.id,
                label: team.displayName,
              }))}
              isSelected={(id) => id === draft.teamId}
              onSelect={(id) => setDraft(acceptDraftForTeam(data, id))}
            />
          </Field>
          <Field title={copy.venue} error={errors.venue}>
            <ChipGrid
              label={copy.venue}
              chips={acceptVenueChips(data, locale).map((venue) => ({
                value: venue.value,
                label: venue.preferred ? venue.accessibilityLabel : venue.label,
                accessibilityLabel: venue.accessibilityLabel,
              }))}
              isSelected={(id) => id === draft.venueId}
              onSelect={(id) => setDraft(acceptPickVenue(draft, id))}
            />
          </Field>
          {courts.length > 0 ? (
            <Field title={copy.court} hint={copy.courtHint}>
              <ChipGrid
                label={copy.court}
                chips={courts}
                isSelected={(id) => id === draft.courtId}
                onSelect={(id) => setDraft(acceptPickCourt(draft, id))}
              />
            </Field>
          ) : null}
          {days.length === 0 ? (
            <Text size="meta" tone="muted">
              {copy.noSlots}
            </Text>
          ) : (
            <Field title={copy.day} error={errors.slot}>
              <ChipGrid
                label={copy.day}
                chips={days.map((option) => ({
                  value: option.key,
                  label: option.label,
                  accessibilityLabel: option.accessibilityLabel,
                }))}
                isSelected={(key) => key === draft.dayKey}
                onSelect={(key) => setDraft(acceptPickDay(draft, key))}
              />
              {day ? (
                <View style={{ gap: 6 }}>
                  <Text size="meta" tone="muted">
                    {copy.time}
                  </Text>
                  <ChipGrid
                    label={copy.time}
                    chips={day.slots.map((slot) => ({
                      value: slot.startsAt.getTime(),
                      label: slot.label,
                      accessibilityLabel: slot.accessibilityLabel,
                    }))}
                    isSelected={(time) => time === draft.startsAt?.getTime()}
                    onSelect={(time) =>
                      setDraft({ ...draft, startsAt: new Date(time) })
                    }
                  />
                </View>
              ) : null}
            </Field>
          )}
          <Field title={copy.price} hint={copy.priceHint} error={errors.price}>
            <TextField
              value={draft.price}
              onChangeText={(price) => setDraft({ ...draft, price })}
              placeholder={copy.pricePlaceholder}
              keyboardType="decimal-pad"
              accessibilityLabel={copy.price}
              ltr
            />
          </Field>
        </View>
      )}
    </Sheet>
  );
}

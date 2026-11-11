import { radii, typeScale } from "@repo/design-tokens";
import { addPlayerCompletePhone } from "@repo/domain/add-player-by-phone";
import {
  CALLING_COUNTRIES,
  callingCountryByIso,
  callingCountryName,
  countryFlagEmoji,
  DEFAULT_CALLING_COUNTRY_ISO,
  formatNationalNumber,
  nationalDigits,
  phoneShapePlaceholder,
} from "@repo/domain/phone-number";
import type { Sport } from "@repo/domain/sport";
import {
  teamNewPlayerAddLabel,
  teamNewPlayerFootball,
  teamNewPlayerRoleChoices,
  teamPhoneLookupCard,
  type TeamNewPlayerRole,
  type TeamRosterDraftPhone,
} from "@repo/domain/team-roster-draft";
import { ChevronDown, UserRoundPlus } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { useLocale, useMessages } from "../i18n/locale-provider";
import { isLayoutRtl } from "../i18n/rtl";
import { hairline } from "../primitives/hairline-width";
import { Sheet } from "../primitives/sheet";
import { SurfaceToneContext } from "../primitives/surface-context";
import { Text } from "../primitives/text";
import { inputType } from "../primitives/text-field";
import { inputDirectionStyle } from "../primitives/text-direction";
import { useToast } from "../primitives/toast";
import { api } from "../trpc/react";
import { useColors } from "../theme/theme-provider";
import {
  CreateTeamCard,
  CreateTeamPillButton,
  CreateTeamTile,
} from "./create-team-parts";

const FIELD_HEIGHT = 52;

function PhoneBox({
  countryIso,
  national,
  onCountryIsoChange,
  onNationalChange,
  disabled,
}: {
  countryIso: string;
  national: string;
  onCountryIsoChange: (iso: string) => void;
  onNationalChange: (national: string) => void;
  disabled: boolean;
}) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [picking, setPicking] = useState(false);
  const country = callingCountryByIso(countryIso);
  return (
    <>
      <View
        style={{
          height: FIELD_HEIGHT,
          flexDirection: "row",
          direction: "ltr",
          alignItems: "center",
          borderWidth: hairline,
          borderColor: focused ? colors.ink : colors.rule,
          borderRadius: radii.lg,
          overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={m.mobileHome.phoneField.countryCode(
            country ? callingCountryName(countryIso, locale) : countryIso,
          )}
          disabled={disabled}
          onPress={() => setPicking(true)}
          style={{
            height: "100%",
            paddingHorizontal: 14,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: colors.wash,
            borderEndWidth: hairline,
            borderEndColor: colors.rule,
          }}
        >
          <Text ltr>+{country?.callingCode}</Text>
          <ChevronDown size={12} color={colors.muted} />
        </Pressable>
        <TextInput
          accessibilityLabel={m.team.create.phoneLabel}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          editable={!disabled}
          placeholder={
            phoneShapePlaceholder(countryIso) ?? country?.placeholder
          }
          placeholderTextColor={colors.muted}
          selectionColor={colors.ink}
          value={formatNationalNumber(countryIso, national)}
          onChangeText={(value) =>
            onNationalChange(
              nationalDigits(value).slice(0, country?.nationalLength),
            )
          }
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            height: "100%",
            paddingHorizontal: 14,
            color: colors.ink,
            ...inputType(typeScale.lead.size, "normal"),
            letterSpacing: typeScale.lead.size * 0.04,
            ...inputDirectionStyle(isLayoutRtl(), true),
          }}
        />
      </View>
      <Sheet
        visible={picking}
        onClose={() => setPicking(false)}
        title={m.mobileHome.phoneField.countryCodeTitle}
      >
        {CALLING_COUNTRIES.map((item) => (
          <Pressable
            key={item.iso}
            accessibilityRole="button"
            accessibilityState={{ selected: item.iso === countryIso }}
            onPress={() => {
              onCountryIsoChange(item.iso);
              onNationalChange(national.slice(0, item.nationalLength));
              setPicking(false);
            }}
            style={{
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Text>{countryFlagEmoji(item.iso)}</Text>
            <Text
              weight={item.iso === countryIso ? "semibold" : "regular"}
              style={{ flex: 1 }}
            >
              {callingCountryName(item.iso, locale)}
            </Text>
            <Text tone="muted" ltr>
              +{item.callingCode}
            </Text>
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}

/**
 * By phone: the number, then who it is. Someone on Temba gets an invite; a
 * number that isn't gets a name and joins the Roster directly.
 */
export function CreateTeamPhoneLookup({
  sport,
  listedPhones,
  full,
  disabled,
  onAdd,
}: {
  sport: Sport;
  listedPhones: readonly string[];
  full: boolean;
  disabled: boolean;
  onAdd: (phone: TeamRosterDraftPhone) => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const colors = useColors();
  const toast = useToast();
  const [countryIso, setCountryIso] = useState(DEFAULT_CALLING_COUNTRY_ISO);
  const [national, setNational] = useState("");
  const [name, setName] = useState("");
  const [nameFocused, setNameFocused] = useState(false);
  const [role, setRole] = useState<TeamNewPlayerRole | null>(null);

  const e164 = addPlayerCompletePhone(countryIso, national);
  const preview = api.teams.previewPlayerByPhone.useQuery(
    { countryIso, nationalNumber: national, sport },
    { enabled: e164 != null, retry: false },
  );
  const previewData = e164 ? (preview.data ?? null) : null;
  const card = previewData
    ? teamPhoneLookupCard(
        previewData,
        { listed: e164 != null && listedPhones.includes(e164), sport },
        locale,
      )
    : null;
  const blocked = disabled || full;

  function add() {
    if (!previewData || e164 == null || blocked) {
      return;
    }
    const isNew = previewData.kind === "new";
    const listedName = isNew
      ? name.trim()
      : (previewData.name ?? previewData.phoneMasked ?? "");
    if (listedName.length === 0) {
      return;
    }
    onAdd({
      e164,
      countryIso,
      nationalNumber: national,
      name: listedName,
      kind: previewData.kind,
      phoneMasked: previewData.phoneMasked,
      levelBand: previewData.levelBand ?? null,
      footballRole: previewData.footballRole ?? null,
      footballPosition: previewData.footballPosition ?? null,
      football:
        isNew && sport === "football" ? teamNewPlayerFootball(role) : undefined,
    });
    toast.show(m.team.addPlayers.listed(listedName));
    setNational("");
    setName("");
    setRole(null);
  }

  return (
    <View style={{ gap: 8 }}>
      <PhoneBox
        countryIso={countryIso}
        national={national}
        onCountryIsoChange={setCountryIso}
        onNationalChange={setNational}
        disabled={disabled}
      />
      <View accessibilityLiveRegion="polite">
        {e164 && preview.error ? (
          <Text size="meta" weight="medium">
            {preview.error.message}
          </Text>
        ) : e164 && preview.isFetching && !previewData ? (
          <Text size="eyebrow" tone="muted">
            {m.team.create.lookingUp}
          </Text>
        ) : null}
      </View>

      {card?.kind === "new" ? (
        <CreateTeamCard emphasis>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <CreateTeamTile tone="added" size="md">
              <UserRoundPlus size={16} color={colors.ink} />
            </CreateTeamTile>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold">{card.title}</Text>
              <Text size="eyebrow" tone="muted">
                {card.line}
              </Text>
            </View>
          </View>
          <View
            style={{
              borderTopWidth: hairline,
              borderTopColor: colors.rule,
              paddingHorizontal: 16,
              paddingVertical: 12,
              gap: 8,
            }}
          >
            <Text size="eyebrow" tone="muted">
              {m.team.create.lookup.nameLabel}
            </Text>
            <TextInput
              accessibilityLabel={m.team.create.lookup.nameLabel}
              value={name}
              onChangeText={setName}
              maxLength={100}
              editable={!disabled}
              autoComplete="off"
              selectionColor={colors.ink}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              style={{
                height: 48,
                paddingHorizontal: 14,
                borderRadius: radii.lg,
                borderWidth: hairline,
                borderColor: nameFocused ? colors.ink : colors.inputBorder,
                color: colors.ink,
                ...inputType(16, "normal"),
                ...inputDirectionStyle(isLayoutRtl(), false),
              }}
            />
            {sport === "football" ? (
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel={m.team.create.lookup.roleLabel}
                style={{ flexDirection: "row", gap: 6 }}
              >
                {teamNewPlayerRoleChoices(locale).map((choice) => {
                  const selected = role === choice.value;
                  return (
                    <SurfaceToneContext.Provider
                      key={choice.value}
                      value={selected ? "ink" : "paper"}
                    >
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel={[choice.code, choice.name].join(
                          m.common.listSeparator,
                        )}
                        accessibilityState={{ checked: selected, disabled }}
                        disabled={disabled}
                        onPress={() => setRole(selected ? null : choice.value)}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: radii.md,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          backgroundColor: selected
                            ? colors.control
                            : colors.paper,
                          borderWidth: selected ? 0 : hairline,
                          borderColor: colors.rule,
                        }}
                      >
                        <Text
                          size="eyebrow"
                          mono
                          style={
                            selected ? { color: colors.onControl } : undefined
                          }
                        >
                          {choice.code}
                        </Text>
                        <Text
                          size="eyebrow"
                          tone="muted"
                          style={selected ? { color: colors.dim } : undefined}
                        >
                          {choice.name}
                        </Text>
                      </Pressable>
                    </SurfaceToneContext.Provider>
                  );
                })}
              </View>
            ) : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: blocked || name.trim().length === 0,
            }}
            disabled={blocked || name.trim().length === 0}
            onPress={add}
            style={({ pressed }) => ({
              height: 48,
              alignItems: "center",
              justifyContent: "center",
              borderTopWidth: hairline,
              borderTopColor: colors.rule,
              opacity:
                blocked || name.trim().length === 0 ? 0.5 : pressed ? 0.7 : 1,
            })}
          >
            <Text weight="semibold">{teamNewPlayerAddLabel(name, locale)}</Text>
          </Pressable>
        </CreateTeamCard>
      ) : card ? (
        <CreateTeamCard emphasis>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <CreateTeamTile
              tone={card.kind === "found" ? "plain" : "added"}
              size="md"
              initials={card.initials}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text weight="semibold" numberOfLines={1}>
                {card.name}
              </Text>
              <Text size="eyebrow" tone="muted">
                {card.line}
              </Text>
            </View>
            {card.kind === "blocked" ? null : (
              <CreateTeamPillButton
                label={card.action}
                accessibilityLabel={card.actionA11y}
                disabled={blocked}
                onPress={add}
              />
            )}
          </View>
          {card.kind !== "blocked" && card.note ? (
            <View
              style={{
                borderTopWidth: hairline,
                borderTopColor: colors.rule,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text size="eyebrow" tone="muted">
                {card.note}
              </Text>
            </View>
          ) : null}
        </CreateTeamCard>
      ) : null}
    </View>
  );
}

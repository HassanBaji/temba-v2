import { useUser } from "@clerk/expo";
import { colors, radii, sizes } from "@repo/design-tokens";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { productDayKey } from "@repo/domain/product-timezone";
import {
  GENDERS,
  HOME_AREAS,
  NATIONALITIES,
  homeAreaLabel,
  nationalityLabel,
  type Gender,
  type Nationality,
} from "@repo/domain/profile-details";
import { validateUserNames } from "@repo/domain/user-display-name";
import { Camera, Eye, EyeOff, MapPin } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { fieldError } from "../auth/clerk-forms";
import { FormErrorSummary } from "../auth/form-error-summary";
import { TileChoices } from "../auth/onboarding-choices";
import { Block } from "../home/slot-block";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { slotOf } from "../lib/slot-of";
import { splitTrpcFormError, type SplitFormError } from "../lib/form-error";
import { Avatar } from "../primitives/avatar";
import { Button } from "../primitives/button";
import { Hairline } from "../primitives/hairline";
import { InitialsTile } from "../primitives/initials-tile";
import { Screen } from "../primitives/screen";
import { ScreenHeader, useLeaveScreen } from "../primitives/screen-header";
import { Surface } from "../primitives/surface";
import { Text } from "../primitives/text";
import { TextField } from "../primitives/text-field";
import { useToast } from "../primitives/toast";
import { useProfilePhoto } from "../profile/use-profile-photo";
import { api, type RouterOutputs } from "../trpc/react";
import { PickerField } from "./picker-field";
import { birthDateParts, readBirthDate } from "./settings-model";

type Details = RouterOutputs["users"]["profileDetails"];
type HomeArea = (typeof HOME_AREAS)[number];

function isHomeArea(value: string | null): value is HomeArea {
  return HOME_AREAS.includes(value as HomeArea);
}

function isGender(value: string | null): value is Gender {
  return GENDERS.includes(value as Gender);
}

function isNationality(value: string | null): value is Nationality {
  return NATIONALITIES.includes(value as Nationality);
}

function PhotoRow({ name }: { name: string }) {
  const m = useMessages();
  const toast = useToast();
  const { user } = useUser();
  const { pickPhoto, savePhoto, pending } = useProfilePhoto();

  async function change() {
    const picked = await pickPhoto("library");
    if (!picked.ok) {
      toast.show(picked.message);
      return;
    }
    if (!picked.value) {
      return;
    }
    const saved = await savePhoto(picked.value);
    if (!saved.ok) {
      toast.show(saved.message);
    }
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
      <View>
        {user?.hasImage ? (
          <Avatar name={name} uri={user.imageUrl} size="xl" radius={radii.lg} />
        ) : (
          <InitialsTile name={name} size="lg" />
        )}
        <View
          style={{
            position: "absolute",
            end: -6,
            bottom: -6,
            width: 24,
            height: 24,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.paper,
            borderWidth: 1,
            borderColor: colors.rule,
          }}
        >
          <Camera size={12} color={colors.ink} />
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <Pressable
          accessibilityRole="button"
          disabled={pending}
          onPress={() => void change()}
          hitSlop={8}
        >
          <Text weight="semibold" style={{ textDecorationLine: "underline" }}>
            {pending
              ? `${m.you.details.changePhoto}…`
              : m.you.details.changePhoto}
          </Text>
        </Pressable>
        <Text size="eyebrow" tone="muted">
          {m.you.details.photoNote}
        </Text>
      </View>
    </View>
  );
}

function PrivacyNote() {
  const m = useMessages();
  const d = m.you.details;
  return (
    <Surface padded={false} radius="card">
      {(
        [
          [Eye, d.publicLabel, d.publicNote],
          [EyeOff, d.privateLabel, d.privateNote],
        ] as const
      ).map(([Icon, lead, note], index) => (
        <View key={lead}>
          {index > 0 ? <Hairline /> : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Icon size={sizes.iconRow} color={colors.muted} />
            <Text size="eyebrow" tone="muted" style={{ flex: 1 }}>
              <Text size="eyebrow" weight="semibold">
                {lead}
              </Text>{" "}
              {note}
            </Text>
          </View>
        </View>
      ))}
    </Surface>
  );
}

function DetailsForm({ details }: { details: Details }) {
  const m = useMessages();
  const d = m.you.details;
  const locale = useLocale();
  const toast = useToast();
  const utils = api.useUtils();
  const leave = useLeaveScreen("/profile/settings");
  const { user } = useUser();
  const setProfileDetails = api.users.setProfileDetails.useMutation();

  const [firstName, setFirstName] = useState(
    () => user?.firstName ?? details.firstName ?? "",
  );
  const [lastName, setLastName] = useState(
    () => user?.lastName ?? details.lastName ?? "",
  );
  const [gender, setGender] = useState<Gender | null>(
    isGender(details.gender) ? details.gender : null,
  );
  const [birth, setBirth] = useState(() => birthDateParts(details.birthDate));
  const [homeArea, setHomeArea] = useState<HomeArea | null>(
    isHomeArea(details.homeArea) ? details.homeArea : null,
  );
  const [nationality, setNationality] = useState<Nationality | null>(
    isNationality(details.nationality) ? details.nationality : null,
  );
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);

  const reading = readBirthDate(birth, productDayKey(new Date()), locale);
  const birthError =
    fieldError(split, "birthDate") ??
    (reading.kind === "invalid" && birth.year.length === 4
      ? reading.message
      : undefined);

  async function onSave() {
    if (pending || !user) {
      return;
    }
    const names = validateUserNames({ firstName, lastName }, locale);
    if (!names.ok) {
      setSplit({ fieldErrors: names.fieldErrors, globalMessage: null });
      return;
    }
    if (reading.kind === "invalid") {
      setSplit({
        fieldErrors: { birthDate: reading.message },
        globalMessage: null,
      });
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      await user.update({
        firstName: names.firstName,
        lastName: names.lastName,
      });
    } catch (error) {
      setSplit(splitClerkAuthError(error, locale));
      setPending(false);
      return;
    }
    try {
      await setProfileDetails.mutateAsync({
        firstName: names.firstName,
        lastName: names.lastName,
        gender,
        birthDate: reading.kind === "valid" ? reading.value : null,
        homeArea,
        nationality,
      });
      await Promise.all([
        utils.users.profileDetails.invalidate(),
        utils.users.onboardingState.invalidate(),
        utils.users.home.invalidate(),
      ]);
      toast.show(d.saved);
      leave();
    } catch (error) {
      setSplit(
        splitTrpcFormError(
          error instanceof Error
            ? error
            : new Error(m.common.somethingWentWrong),
        ),
      );
      setPending(false);
    }
  }

  const name = [firstName, lastName].join(" ").trim() || details.name;

  return (
    <>
      <PhotoRow name={name} />
      <FormErrorSummary message={split?.globalMessage} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextField
            label={d.firstName}
            autoComplete="given-name"
            textContentType="givenName"
            value={firstName}
            onChangeText={setFirstName}
            editable={!pending}
            error={fieldError(split, "firstName", "first_name")}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <TextField
            label={d.lastName}
            autoComplete="family-name"
            textContentType="familyName"
            value={lastName}
            onChangeText={setLastName}
            editable={!pending}
            error={fieldError(split, "lastName", "last_name")}
          />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Text size="meta" tone="muted">
          {d.gender}
        </Text>
        <TileChoices<Gender | "">
          label={d.gender}
          choices={GENDERS.map((value) => ({
            value,
            name: d.genders[value],
          }))}
          value={gender ?? ""}
          disabled={pending}
          onSelect={(value) => setGender(value === "" ? null : value)}
        />
      </View>
      <View style={{ gap: 8 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <Text size="meta" tone="muted">
            {d.birthDate}
          </Text>
          {reading.kind === "valid" ? (
            <Text size="eyebrow" tone="muted">
              {reading.othersSee}
            </Text>
          ) : null}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(
            [
              ["day", d.day, 2, 1],
              ["month", d.month, 2, 1],
              ["year", d.year, 4, 1.5],
            ] as const
          ).map(([key, label, maxLength, grow]) => (
            <View key={key} style={{ flex: grow, minWidth: 0 }}>
              <TextField
                accessibilityLabel={`${d.birthDate}, ${label}`}
                placeholder={label}
                keyboardType="number-pad"
                maxLength={maxLength}
                value={birth[key]}
                onChangeText={(text) =>
                  setBirth((current) => ({
                    ...current,
                    [key]: text.replace(/\D/g, ""),
                  }))
                }
                editable={!pending}
              />
            </View>
          ))}
        </View>
        {birthError ? (
          <Text size="meta" style={{ color: colors.danger }}>
            {birthError}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: 6 }}>
        <PickerField<HomeArea>
          label={d.homeArea}
          placeholder={d.pickArea}
          icon={MapPin}
          options={HOME_AREAS.map((value) => ({
            value,
            label: homeAreaLabel(value, locale),
          }))}
          value={homeArea}
          noneLabel={d.none}
          disabled={pending}
          onSelect={setHomeArea}
        />
        <Text size="eyebrow" tone="muted">
          {d.homeAreaNote}
        </Text>
      </View>
      <PickerField<Nationality>
        label={d.nationality}
        labelHint={d.optional}
        placeholder={d.pickNationality}
        options={NATIONALITIES.map((value) => ({
          value,
          label: nationalityLabel(value, locale),
        }))}
        value={nationality}
        noneLabel={d.none}
        disabled={pending}
        onSelect={setNationality}
      />
      <PrivacyNote />
      <Button
        label={d.save}
        size="lg"
        pending={pending}
        onPress={() => void onSave()}
      />
    </>
  );
}

export function DetailsScreen() {
  const m = useMessages();
  const details = api.users.profileDetails.useQuery();
  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback="/profile/settings"
        title={m.you.details.title}
      />
      <Block
        slot={slotOf(details)}
        title={m.you.details.title}
        skeletonHeight={420}
        onRetry={() => void details.refetch()}
      >
        {(data) => <DetailsForm details={data} />}
      </Block>
    </Screen>
  );
}

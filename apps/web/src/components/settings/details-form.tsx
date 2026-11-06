"use client";

import { useUser } from "@clerk/nextjs";
import { Eye, EyeOff, MapPin } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { SettingsChoices } from "~/components/settings/settings-choices";
import {
  birthDateEntry,
  birthDateParts,
  othersSeeLabel,
  type BirthDateParts,
} from "~/components/settings/settings-model";
import {
  DETAILS_PATH,
  SETTINGS_PATH,
  SettingsScreen,
} from "~/components/settings/settings-screen";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { profileTaskHref } from "~/lib/onboarding-step";
import { api, type RouterOutputs } from "~/trpc/react";
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
import {
  validateUserNames,
  type NameFieldErrors,
} from "@repo/domain/user-display-name";

type Details = RouterOutputs["users"]["profileDetails"];
type HomeArea = (typeof HOME_AREAS)[number];

const NO_NATIONALITY = "none";

const FIELD_IDS = {
  firstName: "details-first-name",
  lastName: "details-last-name",
  gender: "details-gender",
  day: "details-birth-day",
  month: "details-birth-month",
  year: "details-birth-year",
  homeArea: "details-home-area",
  nationality: "details-nationality",
};

function isGender(value: string | null): value is Gender {
  return GENDERS.some((gender) => gender === value);
}

function isHomeArea(value: string | null): value is HomeArea {
  return HOME_AREAS.some((area) => area === value);
}

function isNationalityCode(value: string | null): value is Nationality {
  return NATIONALITIES.some((code) => code === value);
}

function Form({
  details,
  clerkUser,
}: {
  details: Details;
  clerkUser: NonNullable<ReturnType<typeof useUser>["user"]>;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.you.details;
  const router = useRouter();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const today = productDayKey(new Date());

  const [firstName, setFirstName] = React.useState(
    clerkUser.firstName ?? details.firstName ?? "",
  );
  const [lastName, setLastName] = React.useState(
    clerkUser.lastName ?? details.lastName ?? "",
  );
  const [gender, setGender] = React.useState<Gender | null>(
    isGender(details.gender) ? details.gender : null,
  );
  const [birth, setBirth] = React.useState<BirthDateParts>(() =>
    birthDateParts(details.birthDate),
  );
  const [homeArea, setHomeArea] = React.useState<HomeArea | null>(
    isHomeArea(details.homeArea) ? details.homeArea : null,
  );
  const [nationality, setNationality] = React.useState<Nationality | null>(
    isNationalityCode(details.nationality) ? details.nationality : null,
  );
  const [nameErrors, setNameErrors] = React.useState<NameFieldErrors>({});
  const [birthError, setBirthError] = React.useState<string | null>(null);
  const [clerkMessage, setClerkMessage] = React.useState<string | null>(null);
  const [savingClerk, setSavingClerk] = React.useState(false);

  const save = api.users.setProfileDetails.useMutation({
    onSuccess: async () => {
      toast.success(copy.saved);
      await utils.users.invalidate();
      router.push(SETTINGS_PATH);
    },
  });

  const pending = savingClerk || save.isPending || save.isSuccess;
  const entry = birthDateEntry(birth, today);
  const othersSee = othersSeeLabel(entry, today, locale);
  const globalMessage = clerkMessage ?? globalFormErrorMessage(save.error);

  React.useEffect(() => {
    if (globalMessage) {
      summaryRef.current?.focus();
    }
  }, [globalMessage]);

  function updateBirth(patch: Partial<BirthDateParts>) {
    setBirth((current) => ({ ...current, ...patch }));
    setBirthError(null);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const names = validateUserNames({ firstName, lastName }, locale);
    const birthProblem =
      entry.kind === "problem"
        ? entry.problem === "tooYoung"
          ? copy.tooYoung
          : copy.birthDateInvalid
        : null;
    setNameErrors(names.ok ? {} : names.fieldErrors);
    setBirthError(birthProblem);
    if (!names.ok || birthProblem) {
      const firstInvalid = !names.ok
        ? names.fieldErrors.firstName
          ? FIELD_IDS.firstName
          : FIELD_IDS.lastName
        : FIELD_IDS.day;
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setClerkMessage(null);
    if (
      names.firstName !== (clerkUser.firstName ?? "") ||
      names.lastName !== (clerkUser.lastName ?? "")
    ) {
      setSavingClerk(true);
      try {
        // Clerk first, then our row, so both agree before the webhook lands.
        await clerkUser.update({
          firstName: names.firstName,
          lastName: names.lastName,
        });
      } catch (err) {
        const split = splitClerkAuthError(err, locale);
        setClerkMessage(
          split.globalMessage ??
            Object.values(split.fieldErrors)[0] ??
            m.common.somethingWentWrong,
        );
        setSavingClerk(false);
        return;
      }
      setSavingClerk(false);
    }

    save.mutate({
      firstName: names.firstName,
      lastName: names.lastName,
      gender,
      birthDate: entry.kind === "date" ? entry.value : null,
      homeArea,
      nationality,
    });
  }

  const typedName = `${firstName} ${lastName}`.trim();
  const displayName =
    typedName === "" ? (clerkUser.fullName ?? details.name) : typedName;

  return (
    <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
      <FormErrorSummary ref={summaryRef} message={globalMessage} />

      <div className="flex items-center gap-4">
        <UserAvatar
          name={displayName}
          image={clerkUser.hasImage ? clerkUser.imageUrl : null}
          className="border-rule rounded-card text-h2 [&_[data-slot=avatar-fallback]]:bg-control [&_[data-slot=avatar-fallback]]:text-on-control [&_[data-slot=avatar-fallback]]:rounded-card size-[72px] border font-semibold data-[size=default]:size-[72px]"
        />
        <div className="min-w-0">
          <Link
            href={profileTaskHref("photo", DETAILS_PATH)}
            className="text-body text-ink focus-visible:ring-ring/50 rounded-sm font-semibold underline underline-offset-4 outline-none focus-visible:ring-[3px]"
          >
            {copy.changePhoto}
          </Link>
          <p className="text-eyebrow text-muted-foreground mt-1">
            {copy.photoNote}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel
            htmlFor={FIELD_IDS.firstName}
            className="text-meta text-muted-foreground"
          >
            {copy.firstName}
          </FieldLabel>
          <Input
            id={FIELD_IDS.firstName}
            autoComplete="given-name"
            size="lg"
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            aria-invalid={Boolean(nameErrors.firstName)}
            aria-describedby={
              nameErrors.firstName ? `${FIELD_IDS.firstName}-error` : undefined
            }
            disabled={pending}
          />
          {nameErrors.firstName ? (
            <FieldError id={`${FIELD_IDS.firstName}-error`}>
              {nameErrors.firstName}
            </FieldError>
          ) : null}
        </Field>
        <Field>
          <FieldLabel
            htmlFor={FIELD_IDS.lastName}
            className="text-meta text-muted-foreground"
          >
            {copy.lastName}
          </FieldLabel>
          <Input
            id={FIELD_IDS.lastName}
            autoComplete="family-name"
            size="lg"
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            aria-invalid={Boolean(nameErrors.lastName)}
            aria-describedby={
              nameErrors.lastName ? `${FIELD_IDS.lastName}-error` : undefined
            }
            disabled={pending}
          />
          {nameErrors.lastName ? (
            <FieldError id={`${FIELD_IDS.lastName}-error`}>
              {nameErrors.lastName}
            </FieldError>
          ) : null}
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <p
          id={`${FIELD_IDS.gender}-label`}
          className="text-meta text-muted-foreground"
        >
          {copy.gender}
        </p>
        <SettingsChoices
          labelledBy={`${FIELD_IDS.gender}-label`}
          choices={GENDERS.map((value) => ({
            value,
            name: copy.genders[value],
          }))}
          value={gender}
          onSelect={setGender}
          disabled={pending}
        />
      </div>

      <div
        role="group"
        aria-labelledby="details-birth-label"
        className="flex flex-col gap-2"
      >
        <div className="flex items-baseline justify-between gap-3">
          <p
            id="details-birth-label"
            className="text-meta text-muted-foreground"
          >
            {copy.birthDate}
          </p>
          {othersSee ? (
            <span className="text-eyebrow text-muted-foreground">
              {othersSee}
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-[1fr_1fr_1.4fr] gap-2" dir="ltr">
          {(
            [
              ["day", copy.day, 2],
              ["month", copy.month, 2],
              ["year", copy.year, 4],
            ] as const
          ).map(([part, label, length]) => (
            <Input
              key={part}
              id={FIELD_IDS[part]}
              aria-label={label}
              placeholder={label}
              inputMode="numeric"
              autoComplete={`bday-${part}`}
              maxLength={length}
              size="lg"
              className="text-center"
              value={birth[part]}
              onChange={(event) =>
                updateBirth({
                  [part]: event.target.value.replace(/\D/g, ""),
                })
              }
              aria-invalid={Boolean(birthError)}
              aria-describedby={birthError ? "details-birth-error" : undefined}
              disabled={pending}
            />
          ))}
        </div>
        {birthError ? (
          <FieldError id="details-birth-error">{birthError}</FieldError>
        ) : null}
      </div>

      <Field>
        <FieldLabel
          htmlFor={FIELD_IDS.homeArea}
          className="text-meta text-muted-foreground"
        >
          {copy.homeArea}
        </FieldLabel>
        <Select
          value={homeArea ?? undefined}
          onValueChange={(value) =>
            setHomeArea(isHomeArea(value) ? value : null)
          }
          disabled={pending}
        >
          <SelectTrigger
            id={FIELD_IDS.homeArea}
            aria-describedby={`${FIELD_IDS.homeArea}-note`}
            className="h-13 data-[size=default]:h-13 w-full rounded-lg px-4"
          >
            <MapPin aria-hidden="true" className="size-4" />
            <span className="flex-1 text-start">
              <SelectValue placeholder={copy.pickArea} />
            </span>
          </SelectTrigger>
          <SelectContent position="popper">
            {HOME_AREAS.map((area) => (
              <SelectItem key={area} value={area}>
                {homeAreaLabel(area, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          id={`${FIELD_IDS.homeArea}-note`}
          className="text-eyebrow text-muted-foreground"
        >
          {copy.homeAreaNote}
        </p>
      </Field>

      <Field>
        <FieldLabel
          htmlFor={FIELD_IDS.nationality}
          className="text-meta text-muted-foreground"
        >
          {copy.nationality}{" "}
          <span className="text-muted-foreground font-normal">
            {copy.optional}
          </span>
        </FieldLabel>
        <Select
          value={nationality ?? NO_NATIONALITY}
          onValueChange={(value) =>
            setNationality(isNationalityCode(value) ? value : null)
          }
          disabled={pending}
        >
          <SelectTrigger
            id={FIELD_IDS.nationality}
            className="h-13 data-[size=default]:h-13 w-full rounded-lg px-4"
          >
            <span className="flex-1 text-start">
              <SelectValue placeholder={copy.pickNationality} />
            </span>
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value={NO_NATIONALITY}>{copy.none}</SelectItem>
            {NATIONALITIES.map((code) => (
              <SelectItem key={code} value={code}>
                {nationalityLabel(code, locale)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <ul className="border-rule rounded-card divide-rule divide-y border">
        <li className="text-meta text-muted-foreground flex items-center gap-3 px-4 py-3">
          <Eye aria-hidden="true" className="size-4 shrink-0" />
          <span>
            <span className="text-ink font-semibold">{copy.publicLabel}</span>{" "}
            {copy.publicNote}
          </span>
        </li>
        <li className="text-meta text-muted-foreground flex items-center gap-3 px-4 py-3">
          <EyeOff aria-hidden="true" className="size-4 shrink-0" />
          <span>
            <span className="text-ink font-semibold">{copy.privateLabel}</span>{" "}
            {copy.privateNote}
          </span>
        </li>
      </ul>

      <Button
        type="submit"
        size="lg"
        className="w-full font-semibold"
        pending={pending}
        pendingLabel={m.common.saving}
      >
        {copy.save}
      </Button>
    </form>
  );
}

/** Your details: photo, name, gender, birth date, home area, nationality. */
export function DetailsScreen() {
  const m = useMessages();
  const { isLoaded, user } = useUser();
  const details = api.users.profileDetails.useQuery();

  return (
    <SettingsScreen title={m.you.details.title} backHref={SETTINGS_PATH}>
      {isLoaded && user && details.data ? (
        <Form details={details.data} clerkUser={user} />
      ) : (
        <div aria-busy="true" className="flex flex-col gap-6">
          <Skeleton className="rounded-card size-[72px]" />
          <Skeleton className="h-13 w-full" />
          <Skeleton className="h-13 w-full" />
          <Skeleton className="h-13 w-full" />
        </div>
      )}
    </SettingsScreen>
  );
}

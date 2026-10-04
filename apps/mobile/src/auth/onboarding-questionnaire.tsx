import { useAuth } from "@clerk/expo";
import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  selfDeclareChoiceFromDisplay,
  type AssignableDisplayLevelBand,
} from "@repo/domain/level-bands";
import {
  PREFERRED_POSITION_CHOICES,
  preferredPositionNote,
} from "@repo/domain/preferred-position";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { splitTrpcFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { Skeleton } from "../primitives/skeleton";
import { Text } from "../primitives/text";
import { api, type RouterInputs } from "../trpc/react";
import { AuthLoading } from "./auth-loading";
import { AuthScreen } from "./auth-screen";
import { FormErrorSummary } from "./form-error-summary";
import {
  PROVISIONING_POLL_MS,
  PROVISIONING_TIMEOUT_MS,
  onboardingStepFromState,
} from "./onboarding-step";

type PreferredPosition =
  RouterInputs["users"]["setPreferredPosition"]["preferredPosition"];
type LevelChoice = AssignableDisplayLevelBand | "unknown";

const LEVEL_CHOICES: { value: LevelChoice; label: string }[] = [
  ...ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
    value: band,
    label: band,
  })),
  { value: "unknown", label: "I don’t know" },
];

function ChoiceRow<T extends string>(props: {
  label: string;
  choices: { value: T; label: string }[];
  value: T | "";
  onSelect: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={props.label}
      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
    >
      {props.choices.map((choice) => (
        <View key={choice.value} style={{ minWidth: "30%", flexGrow: 1 }}>
          <Button
            label={choice.label}
            variant={props.value === choice.value ? "default" : "outline"}
            selected={props.value === choice.value}
            disabled={props.disabled}
            onPress={() => props.onSelect(choice.value)}
          />
        </View>
      ))}
    </View>
  );
}

export function OnboardingQuestionnaire() {
  const { signOut } = useAuth();
  const utils = api.useUtils();
  const state = api.users.onboardingState.useQuery(undefined, {
    refetchInterval: (query) =>
      query.state.data?.provisioning ? PROVISIONING_POLL_MS : false,
  });

  const [position, setPosition] = useState<PreferredPosition | "">("");
  const [levelChoice, setLevelChoice] = useState<LevelChoice | "">("");
  const [changingPosition, setChangingPosition] = useState(false);
  const [provisioningStalled, setProvisioningStalled] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const setPreferredPosition = api.users.setPreferredPosition.useMutation({
    onSuccess: async () => {
      setChangingPosition(false);
      await utils.users.onboardingState.invalidate();
    },
  });
  const selfDeclare = api.ratings.selfDeclare.useMutation({
    onSuccess: () => utils.users.onboardingState.invalidate(),
  });
  const completeOnboarding = api.users.completeOnboarding.useMutation({
    onSuccess: () => utils.users.onboardingState.invalidate(),
  });

  const derivedStep = onboardingStepFromState(state.data);
  const step =
    changingPosition && derivedStep === "level" ? "position" : derivedStep;

  useEffect(() => {
    if (step !== "provisioning" || provisioningStalled) {
      return undefined;
    }
    const id = setTimeout(
      () => setProvisioningStalled(true),
      PROVISIONING_TIMEOUT_MS,
    );
    return () => clearTimeout(id);
  }, [provisioningStalled, step]);

  useEffect(() => {
    if (
      step === "finishing" &&
      !completeOnboarding.isPending &&
      !completeOnboarding.isSuccess &&
      !completeOnboarding.isError
    ) {
      completeOnboarding.mutate();
    }
  }, [completeOnboarding, step]);

  function onSignOut() {
    setSigningOut(true);
    signOut().catch(() => setSigningOut(false));
  }

  const signOutButton = (
    <Button
      label="Sign out"
      variant="outline"
      pending={signingOut}
      onPress={onSignOut}
    />
  );

  if (state.error && !state.data) {
    return (
      <AuthScreen
        title="Setup could not be loaded"
        description={state.error.message}
      >
        <Button
          label="Try again"
          size="lg"
          onPress={() => void state.refetch()}
        />
        {signOutButton}
      </AuthScreen>
    );
  }

  if (step === "loading") {
    return <AuthLoading />;
  }

  if (step === "provisioning" && provisioningStalled) {
    return (
      <AuthScreen
        title="Setup is taking longer than usual"
        description="Your Temba account is still being created. Try again, or sign out and come back later."
      >
        <Button
          label="Try again"
          size="lg"
          onPress={() => {
            setProvisioningStalled(false);
            void state.refetch();
          }}
        />
        {signOutButton}
      </AuthScreen>
    );
  }

  if (step === "provisioning") {
    return (
      <AuthScreen title="Setting up your account">
        <Text tone="muted" accessibilityLiveRegion="polite">
          Your Temba account is still being created. This only takes a moment
          after sign-up — these two questions open on their own.
        </Text>
        <Skeleton height={96} />
        {signOutButton}
      </AuthScreen>
    );
  }

  if (step === "finishing" || step === "complete") {
    const finishError = completeOnboarding.error
      ? splitTrpcFormError(completeOnboarding.error).globalMessage
      : null;
    return (
      <AuthScreen
        title={finishError ? "Could not finish setup" : "You are all set"}
      >
        <Text tone="muted" accessibilityLiveRegion="polite">
          {finishError
            ? "Both answers are saved. Try finishing again."
            : "Taking you to Temba…"}
        </Text>
        <FormErrorSummary message={finishError} />
        {finishError ? (
          <Button
            label="Try again"
            size="lg"
            onPress={() => completeOnboarding.reset()}
          />
        ) : null}
      </AuthScreen>
    );
  }

  if (step === "position") {
    const split = setPreferredPosition.error
      ? splitTrpcFormError(setPreferredPosition.error)
      : null;
    const pending = setPreferredPosition.isPending;
    return (
      <AuthScreen
        eyebrow="Step 1 of 2"
        title="Which side do you play?"
        description="Your default side when you pick a Game seat. You can change it later in Settings."
      >
        <FormErrorSummary message={split?.globalMessage} />
        <ChoiceRow
          label="Preferred Position"
          choices={PREFERRED_POSITION_CHOICES.map((choice) => ({
            value: choice.value,
            label: choice.label,
          }))}
          value={position}
          onSelect={setPosition}
          disabled={pending}
        />
        {position ? (
          <Text size="meta" tone="muted">
            {preferredPositionNote(position)}
          </Text>
        ) : null}
        {split?.fieldErrors.preferredPosition ? (
          <Text size="meta" weight="medium">
            {split.fieldErrors.preferredPosition}
          </Text>
        ) : null}
        <Button
          label="Continue"
          size="lg"
          pending={pending}
          disabled={position === ""}
          onPress={() => {
            if (position !== "") {
              setPreferredPosition.mutate({ preferredPosition: position });
            }
          }}
        />
      </AuthScreen>
    );
  }

  const split = selfDeclare.error
    ? splitTrpcFormError(selfDeclare.error)
    : null;
  const levelPending = selfDeclare.isPending || selfDeclare.isSuccess;
  return (
    <AuthScreen
      eyebrow="Step 2 of 2"
      title="Declare your Level"
      description="Place yourself on the padel ladder once. Pick a Level band, or I don’t know if you are unsure."
    >
      <FormErrorSummary message={split?.globalMessage} />
      <ChoiceRow
        label="Level band"
        choices={LEVEL_CHOICES}
        value={levelChoice}
        onSelect={setLevelChoice}
        disabled={levelPending}
      />
      {split?.fieldErrors.choice ? (
        <Text size="meta" weight="medium">
          {split.fieldErrors.choice}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button
          label="Back"
          variant="outline"
          disabled={levelPending}
          onPress={() => {
            setPreferredPosition.reset();
            setPosition(state.data?.preferredPosition ?? "");
            setChangingPosition(true);
          }}
        />
        <View style={{ flex: 1 }}>
          <Button
            label="Finish"
            pending={levelPending}
            disabled={levelChoice === ""}
            onPress={() => {
              if (levelChoice !== "") {
                selfDeclare.mutate({
                  sport: "padel",
                  choice: selfDeclareChoiceFromDisplay(levelChoice),
                });
              }
            }}
          />
        </View>
      </View>
    </AuthScreen>
  );
}

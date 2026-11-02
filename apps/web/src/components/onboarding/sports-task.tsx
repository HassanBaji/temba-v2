"use client";

import { useRouter } from "next/navigation";

import { OnboardingQuestionnaire } from "~/components/onboarding/onboarding-questionnaire";
import { OnboardingStateGate } from "~/components/onboarding/onboarding-state-gate";

/** The "Pick your sports and level" Profile task: the questionnaire, then back to the list. */
export function SportsTask({ backHref }: { backHref: string }) {
  const router = useRouter();
  return (
    <OnboardingStateGate>
      {(state) => (
        <OnboardingQuestionnaire
          state={state}
          backHref={backHref}
          onDone={() => router.replace(backHref)}
        />
      )}
    </OnboardingStateGate>
  );
}

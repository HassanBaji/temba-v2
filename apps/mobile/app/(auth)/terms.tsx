import { router, useLocalSearchParams } from "expo-router";

import { goBackOrWelcome } from "../../src/auth/auth-screen";
import { TermsScreen } from "../../src/legal/terms-screen";

export default function Terms() {
  const { from } = useLocalSearchParams<{ from?: string }>();

  return (
    <TermsScreen
      onBack={goBackOrWelcome}
      onAgree={
        from === "sign-up"
          ? () =>
              router.navigate({
                pathname: "/sign-up",
                params: { terms: "accepted" },
              })
          : undefined
      }
    />
  );
}

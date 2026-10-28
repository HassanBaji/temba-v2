import { router } from "expo-router";

import { TermsScreen } from "../../../src/legal/terms-screen";

export default function Terms() {
  return (
    <TermsScreen
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/profile")
      }
    />
  );
}

import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { env } from "./env";
import { useQueryEnvironment } from "./lib/query-environment";
import { ToastProvider } from "./primitives/toast";
import { TRPCReactProvider } from "./trpc/react";

function requirePublishableKey() {
  if (!env.clerkPublishableKey) {
    throw new Error(
      "Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in apps/mobile/.env (see .env.example).",
    );
  }
  return env.clerkPublishableKey;
}

export function Providers(props: { children: React.ReactNode }) {
  useQueryEnvironment();

  return (
    <SafeAreaProvider>
      <ClerkProvider
        publishableKey={requirePublishableKey()}
        tokenCache={tokenCache}
      >
        <TRPCReactProvider>
          <ToastProvider>{props.children}</ToastProvider>
        </TRPCReactProvider>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}

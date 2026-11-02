import { useAuth } from "@clerk/expo";
import { Redirect, Stack, type Href } from "expo-router";
import { useRef } from "react";

import { AuthLoading } from "../../src/auth/auth-loading";
import { consumePostAuthTarget } from "../../src/auth/post-auth-target";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const target = useRef<Href | null>(null);

  if (!isLoaded) {
    return <AuthLoading />;
  }
  if (isSignedIn) {
    target.current ??= consumePostAuthTarget() ?? "/";
    return <Redirect href={target.current} />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}

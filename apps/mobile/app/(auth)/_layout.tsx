import { useAuth } from "@clerk/expo";
import { Redirect, Stack } from "expo-router";

import { AuthLoading } from "../../src/auth/auth-loading";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <AuthLoading />;
  }
  if (isSignedIn) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}

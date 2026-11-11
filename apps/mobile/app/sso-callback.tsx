import { useRouter } from "expo-router";
import { useEffect } from "react";

import { AuthLoading } from "../src/auth/auth-loading";

/**
 * Google's browser flow returns to `temba://sso-callback`. On Android the
 * router also opens that link as a route while the sign-in screen underneath
 * finishes the flow, so this steps back to it instead of showing "Unmatched".
 */
export default function SsoCallbackScreen() {
  const router = useRouter();
  useEffect(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/welcome");
    }
  }, [router]);
  return <AuthLoading />;
}

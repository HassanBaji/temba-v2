import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * A release build has no Expo dev server to find the API from, so every build
 * profile but development must name the API origin, or the App would throw at
 * launch. EAS sets EAS_BUILD_PROFILE while it reads this config.
 */
export function releaseApiOriginProblem(env: {
  EAS_BUILD_PROFILE?: string;
  EXPO_PUBLIC_API_ORIGIN?: string;
}): string | null {
  const profile = env.EAS_BUILD_PROFILE?.trim();
  if (!profile || profile === "development") {
    return null;
  }
  const origin = env.EXPO_PUBLIC_API_ORIGIN?.trim().replace(/\/+$/, "");
  if (!origin) {
    return `EXPO_PUBLIC_API_ORIGIN is not set for the "${profile}" build profile. Set it in eas.json.`;
  }
  if (!/^https:\/\/[^/\s]+$/.test(origin)) {
    return `EXPO_PUBLIC_API_ORIGIN for the "${profile}" build profile must be an https origin, got "${origin}".`;
  }
  return null;
}

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  const env = process.env as Record<string, string | undefined>;
  const problem = releaseApiOriginProblem({
    EAS_BUILD_PROFILE: env.EAS_BUILD_PROFILE,
    EXPO_PUBLIC_API_ORIGIN: env.EXPO_PUBLIC_API_ORIGIN,
  });
  if (problem) {
    throw new Error(problem);
  }
  return config as ExpoConfig;
}

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

/**
 * The domain whose Game page links open in the App (universal links). The web
 * App serves the matching Apple App Site Association file. A plain http
 * origin, as in local development, cannot carry universal links.
 */
export function associatedDomains(env: {
  EXPO_PUBLIC_WEB_ORIGIN?: string;
}): string[] {
  const origin = env.EXPO_PUBLIC_WEB_ORIGIN?.trim().replace(/\/+$/, "");
  const host = origin ? /^https:\/\/([^/\s]+)$/.exec(origin)?.[1] : undefined;
  return host ? [`applinks:${host}`] : [];
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
  const domains = associatedDomains({
    EXPO_PUBLIC_WEB_ORIGIN: env.EXPO_PUBLIC_WEB_ORIGIN,
  });
  const expo = config as ExpoConfig;
  if (domains.length === 0) {
    return expo;
  }
  return {
    ...expo,
    ios: {
      ...expo.ios,
      associatedDomains: [...(expo.ios?.associatedDomains ?? []), ...domains],
    },
  };
}

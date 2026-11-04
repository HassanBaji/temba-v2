const FIRST_STRONG_ISOLATE = "⁨";
const POP_DIRECTIONAL_ISOLATE = "⁩";

/**
 * Keeps a Latin run such as a Level band ("C+"), a scoreline or a date
 * reading in its own direction inside an Arabic sentence. Works in plain
 * strings, so React Native Text gets the same fix as the web.
 */
export function isolate(text: string) {
  return `${FIRST_STRONG_ISOLATE}${text}${POP_DIRECTIONAL_ISOLATE}`;
}

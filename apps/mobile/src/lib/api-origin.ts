export const API_PORT = 4000;

export function resolveApiOrigin({
  override,
  devServerHostUri,
}: {
  override?: string | null;
  devServerHostUri?: string | null;
}): string {
  const explicit = override?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;

  const host = devServerHostUri?.split(":")[0]?.trim();
  if (host) return `http://${host}:${API_PORT}`;

  throw new Error(
    "Cannot find the API. Set EXPO_PUBLIC_API_ORIGIN, or start the App from the Expo dev server.",
  );
}

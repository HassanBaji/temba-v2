const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export function mediaUrl(
  path: string | null | undefined,
  apiOrigin: string,
): string | null {
  if (!path) {
    return null;
  }
  if (HAS_SCHEME.test(path)) {
    return path;
  }
  const origin = apiOrigin.replace(/\/+$/, "");
  return `${origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

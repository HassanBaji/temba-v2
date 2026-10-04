export const REMOTE_PATHS = ["/api/media/:path*", "/api/webhooks"];

/**
 * @param {string | undefined} apiOrigin
 * @param {readonly string[]} [paths]
 */
export function remotePathRewrites(apiOrigin, paths = REMOTE_PATHS) {
  if (!apiOrigin) return [];
  return paths.map((source) => ({
    source,
    destination: `${apiOrigin}${source}`,
  }));
}

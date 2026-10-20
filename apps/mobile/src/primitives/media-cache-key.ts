const SIGNING_PARAM = /^x-amz-/i;

/**
 * The API re-signs bucket URLs every few days (ADR-0034), so the disk cache keys an
 * image by its URL without the signing parameters. The `v` parameter stays, so a
 * replaced image still gets a new key.
 */
export function mediaCacheKey(uri: string): string {
  const queryStart = uri.indexOf("?");
  if (queryStart === -1) {
    return uri;
  }
  const kept = uri
    .slice(queryStart + 1)
    .split("&")
    .filter((pair) => pair !== "" && !SIGNING_PARAM.test(pair));
  const base = uri.slice(0, queryStart);
  return kept.length > 0 ? `${base}?${kept.join("&")}` : base;
}

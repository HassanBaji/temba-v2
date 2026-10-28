const plainHttpHost =
  /^(localhost|127\.0\.0\.1|\[::1\]|[^/:]+\.railway\.internal)(:\d+)?$/i;

/**
 * Accepts a full origin or a bare host with an optional port, such as Railway's
 * `${{api.RAILWAY_PRIVATE_DOMAIN}}:${{api.PORT}}`. Railway's private network
 * speaks plain HTTP, so internal and loopback hosts get `http://` and any other
 * bare host gets `https://`.
 *
 * @param {string | undefined} value
 * @returns {string | undefined}
 */
export function toApiOrigin(value) {
  const trimmed = value?.trim().replace(/\/+$/, "");
  if (!trimmed) return undefined;
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)) return trimmed;
  return `${plainHttpHost.test(trimmed) ? "http" : "https"}://${trimmed}`;
}

const PROBE_ORIGIN = "https://internal.invalid";

// WHATWG URL parsing strips tab, LF and CR, so "/\t/evil.example" becomes
// "//evil.example": a protocol-relative URL to another host.
const ASCII_CONTROL = /[\u0000-\u001f\u007f]/;

function hasUnsafeShape(value: string) {
  return (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    ASCII_CONTROL.test(value)
  );
}

function decodedOnce(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function staysOnOrigin(value: string) {
  try {
    return new URL(value, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Only allow same-origin relative paths for post-auth return (invite URLs).
 * The decoded form is checked too, for any reader that decodes the path again.
 */
export function safeInternalRedirect(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (hasUnsafeShape(value) || value.includes("@")) {
    return null;
  }

  const decoded = decodedOnce(value);
  if (decoded === null || hasUnsafeShape(decoded)) {
    return null;
  }

  if (!staysOnOrigin(value)) {
    return null;
  }

  return value;
}

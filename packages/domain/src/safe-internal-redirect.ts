/**
 * Only allow same-origin relative paths for post-auth return (invite URLs).
 */
export function safeInternalRedirect(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  if (value.includes("\\") || value.includes("@")) {
    return null;
  }

  return value;
}

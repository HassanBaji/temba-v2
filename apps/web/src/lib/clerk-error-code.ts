/**
 * Whether a thrown Clerk API error carries the given code. The shared
 * `splitClerkAuthError` turns codes into copy; the unified phone door needs
 * the raw code to tell an unknown number (`form_identifier_not_found`) from a
 * real failure.
 */
export function hasClerkErrorCode(err: unknown, code: string): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const { errors } = err as { errors?: unknown };
  return (
    Array.isArray(errors) &&
    errors.some(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        (item as { code?: unknown }).code === code,
    )
  );
}

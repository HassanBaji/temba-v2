export function isNotFoundError(error: unknown) {
  if (!error || typeof error !== "object" || !("data" in error)) {
    return false;
  }

  const data = error.data;
  if (!data || typeof data !== "object" || !("code" in data)) {
    return false;
  }

  return data.code === "NOT_FOUND";
}

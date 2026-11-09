export type ErrorRefusal = "forbidden" | "notFound";

export type ErrorWithCode = {
  message?: string;
  data?: { code?: string } | null;
};

const REFUSALS: Record<string, ErrorRefusal> = {
  FORBIDDEN: "forbidden",
  NOT_FOUND: "notFound",
};

/** A refusal is a decision by the server; trying again gives the same answer. */
export function errorRefusal(
  error: ErrorWithCode | null | undefined,
): ErrorRefusal | null {
  const code = error?.data?.code;
  return code ? (REFUSALS[code] ?? null) : null;
}

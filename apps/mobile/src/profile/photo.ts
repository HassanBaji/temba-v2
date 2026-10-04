import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";

const DEFAULT_MIME_TYPE = "image/jpeg";

export function imageDataUri(base64: string, mimeType?: string | null) {
  return `data:${mimeType ?? DEFAULT_MIME_TYPE};base64,${base64}`;
}

export function photoErrorMessage(error: unknown): string {
  const { fieldErrors, globalMessage } = splitClerkAuthError(error);
  return (
    globalMessage ?? Object.values(fieldErrors)[0] ?? "Something went wrong."
  );
}

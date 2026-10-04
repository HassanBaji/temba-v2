export type SplitFormError = {
  fieldErrors: Record<string, string>;
  globalMessage: string | null;
};

type FormErrorLike = {
  message: string;
  data?: { zodError?: unknown } | null;
};

function fieldErrorsFromZod(zodError: unknown): Record<string, string> {
  if (!zodError || typeof zodError !== "object") {
    return {};
  }
  const raw = (zodError as { fieldErrors?: unknown }).fieldErrors;
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const fieldErrors: Record<string, string> = {};
  for (const [key, messages] of Object.entries(raw)) {
    if (Array.isArray(messages) && typeof messages[0] === "string") {
      fieldErrors[key] = messages[0];
    }
  }
  return fieldErrors;
}

function formMessageFromZod(zodError: unknown): string | undefined {
  if (!zodError || typeof zodError !== "object") {
    return undefined;
  }
  const formErrors = (zodError as { formErrors?: unknown }).formErrors;
  if (Array.isArray(formErrors) && typeof formErrors[0] === "string") {
    return formErrors[0];
  }
  return undefined;
}

export function splitTrpcFormError(error: FormErrorLike): SplitFormError {
  const fieldErrors = fieldErrorsFromZod(error.data?.zodError);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, globalMessage: null };
  }
  return {
    fieldErrors: {},
    globalMessage: formMessageFromZod(error.data?.zodError) ?? error.message,
  };
}

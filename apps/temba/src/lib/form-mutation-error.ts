import { toast } from "sonner";

export type SplitFormError = {
  fieldErrors: Record<string, string>;
  globalMessage: string | null;
};

type FormErrorLike = {
  message: string;
  data?: {
    zodError?: unknown;
  } | null;
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

export function fieldErrorMessage(
  error: FormErrorLike | null | undefined,
  field: string,
): string | undefined {
  if (!error) {
    return undefined;
  }
  return splitTrpcFormError(error).fieldErrors[field];
}

export function globalFormErrorMessage(
  error: FormErrorLike | null | undefined,
): string | null {
  if (!error) {
    return null;
  }
  return splitTrpcFormError(error).globalMessage;
}

export function toastGlobalFormError(error: FormErrorLike) {
  const { globalMessage } = splitTrpcFormError(error);
  if (globalMessage) {
    toast.error(globalMessage);
  }
}

export function focusFormFailure(
  error: FormErrorLike,
  fieldElementIds: Record<string, string>,
  summary: HTMLElement | null,
) {
  const split = splitTrpcFormError(error);
  const firstField = Object.keys(split.fieldErrors)[0];
  if (firstField) {
    const elementId = fieldElementIds[firstField] ?? firstField;
    document.getElementById(elementId)?.focus();
    return;
  }
  summary?.focus();
}

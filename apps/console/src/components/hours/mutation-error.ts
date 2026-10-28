import { toast } from "sonner";

type MutationErrorLike = {
  message: string;
  data?: { zodError?: unknown } | null;
};

type FlattenedZodError = {
  fieldErrors?: Record<string, string[] | undefined>;
  formErrors?: string[];
};

/** The first Zod issue when the door rejected the input, else the door's own message. */
export function mutationErrorMessage(error: MutationErrorLike): string {
  const zodError = error.data?.zodError as FlattenedZodError | null | undefined;
  if (zodError && typeof zodError === "object") {
    const first = [
      ...Object.values(zodError.fieldErrors ?? {}).flat(),
      ...(zodError.formErrors ?? []),
    ].find((message): message is string => typeof message === "string");
    if (first) {
      return first;
    }
  }
  return error.message;
}

export function toastMutationError(error: MutationErrorLike) {
  toast.error(mutationErrorMessage(error));
}

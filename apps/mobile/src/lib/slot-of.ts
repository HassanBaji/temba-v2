import type { Slot } from "../home/home-model";

export function slotOf<T>(query: {
  data: T | undefined;
  error: { message: string } | null;
  isLoading: boolean;
}): Slot<T> {
  if (query.error) {
    return { status: "error", message: query.error.message };
  }
  if (query.data === undefined || query.isLoading) {
    return { status: "loading" };
  }
  return { status: "ready", value: query.data };
}

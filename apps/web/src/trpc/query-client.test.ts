import { describe, expect, it, vi } from "vitest";

import { createQueryClient, OWN_ERROR_UI } from "./query-client";

async function failMutation(
  onUnhandled: (error: unknown) => void,
  options: { onError?: () => void; meta?: Record<string, unknown> } = {},
) {
  const client = createQueryClient(onUnhandled);
  const failure = new Error("Not allowed");
  const mutation = client.getMutationCache().build(client, {
    mutationFn: () => Promise.reject(failure),
    retry: false,
    ...options,
  });
  await mutation.execute(undefined).catch(() => undefined);
  return failure;
}

describe("createQueryClient mutation fallback", () => {
  it("reports a failed mutation that has no handling of its own", async () => {
    const onUnhandled = vi.fn();
    const failure = await failMutation(onUnhandled);
    expect(onUnhandled).toHaveBeenCalledWith(failure);
  });

  it("stays quiet when the mutation has its own onError", async () => {
    const onUnhandled = vi.fn();
    const onError = vi.fn();
    await failMutation(onUnhandled, { onError });
    expect(onError).toHaveBeenCalledOnce();
    expect(onUnhandled).not.toHaveBeenCalled();
  });

  it("stays quiet when the mutation shows its own error UI", async () => {
    const onUnhandled = vi.fn();
    await failMutation(onUnhandled, { meta: OWN_ERROR_UI });
    expect(onUnhandled).not.toHaveBeenCalled();
  });
});

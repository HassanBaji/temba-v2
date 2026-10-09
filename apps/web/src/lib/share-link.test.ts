import { describe, expect, it, vi } from "vitest";

import { shareOrCopyLink } from "~/lib/share-link";

function abortError() {
  const error = new Error("cancelled");
  error.name = "AbortError";
  return error;
}

describe("shareOrCopyLink", () => {
  it("uses the share sheet on touch devices that support it", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(
      shareOrCopyLink(
        { text: "Join" },
        { share, writeText, coarsePointer: true },
      ),
    ).resolves.toBe("shared");
    expect(share).toHaveBeenCalledWith({ text: "Join" });
    expect(writeText).not.toHaveBeenCalled();
  });

  it("shares the url alone when there is one", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const writeText = vi.fn();
    await shareOrCopyLink(
      { text: "https://x.test/g", url: "https://x.test/g" },
      { share, writeText, coarsePointer: true },
    );
    expect(share).toHaveBeenCalledWith({ url: "https://x.test/g" });
  });

  it("copies on fine pointers even when share exists", async () => {
    const share = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(
      shareOrCopyLink(
        { text: "Join" },
        { share, writeText, coarsePointer: false },
      ),
    ).resolves.toBe("copied");
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith("Join");
  });

  it("reports a dismissed share sheet without copying", async () => {
    const share = vi.fn().mockRejectedValue(abortError());
    const writeText = vi.fn();
    await expect(
      shareOrCopyLink(
        { text: "Join" },
        { share, writeText, coarsePointer: true },
      ),
    ).resolves.toBe("cancelled");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to the clipboard when sharing fails", async () => {
    const share = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(
      shareOrCopyLink(
        { text: "Join" },
        { share, writeText, coarsePointer: true },
      ),
    ).resolves.toBe("copied");
  });

  it("rejects when the clipboard write fails", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    await expect(
      shareOrCopyLink({ text: "Join" }, { writeText, coarsePointer: false }),
    ).rejects.toThrow("denied");
  });
});

import { describe, expect, it, vi } from "vitest";

import { copyTextWhenReady, shareOrCopyLink } from "~/lib/share-link";

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

  it("starts the copy before the link arrives on fine pointers", async () => {
    let arrive: (data: { text: string }) => void = () => undefined;
    const pending = new Promise<{ text: string }>((resolve) => {
      arrive = resolve;
    });
    const writeLater = vi.fn((text: Promise<string>) =>
      text.then(() => undefined),
    );
    const writeText = vi.fn();
    const outcome = shareOrCopyLink(pending, {
      writeText,
      writeLater,
      coarsePointer: false,
    });
    expect(writeLater).toHaveBeenCalledTimes(1);
    arrive({ text: "Join" });
    await expect(outcome).resolves.toBe("copied");
    await expect(writeLater.mock.calls[0]![0]).resolves.toBe("Join");
    expect(writeText).not.toHaveBeenCalled();
  });

  it("reports a link that never arrives", async () => {
    const writeText = vi.fn();
    await expect(
      shareOrCopyLink(Promise.resolve(null), {
        writeText,
        coarsePointer: false,
      }),
    ).resolves.toBe("unavailable");
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("copyTextWhenReady", () => {
  it("hands the clipboard the pending text before it resolves", async () => {
    let arrive: (text: string) => void = () => undefined;
    const pending = new Promise<string>((resolve) => {
      arrive = resolve;
    });
    const writeLater = vi.fn((text: Promise<string>) =>
      text.then(() => undefined),
    );
    const copied = copyTextWhenReady(pending, {
      writeText: vi.fn(),
      writeLater,
    });
    expect(writeLater).toHaveBeenCalledTimes(1);
    arrive("https://x.test/i/abc");
    await expect(copied).resolves.toBe(true);
    await expect(writeLater.mock.calls[0]![0]).resolves.toBe(
      "https://x.test/i/abc",
    );
  });

  it("writes nothing when the text never arrives", async () => {
    const writeLater = vi.fn((text: Promise<string>) =>
      text.then(() => undefined),
    );
    const writeText = vi.fn();
    await expect(
      copyTextWhenReady(Promise.resolve(null), { writeText, writeLater }),
    ).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("falls back to writeText when the deferred write is refused", async () => {
    const writeLater = vi.fn().mockRejectedValue(new Error("unsupported"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(
      copyTextWhenReady(Promise.resolve("Join"), { writeText, writeLater }),
    ).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("Join");
  });

  it("rejects with the first error when both writes are refused", async () => {
    const writeLater = vi.fn().mockRejectedValue(new Error("NotAllowedError"));
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    await expect(
      copyTextWhenReady(Promise.resolve("Join"), { writeText, writeLater }),
    ).rejects.toThrow("NotAllowedError");
  });

  it("awaits the text and writes it when deferred writes are unsupported", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    await expect(
      copyTextWhenReady(Promise.resolve("Join"), { writeText }),
    ).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("Join");
  });
});

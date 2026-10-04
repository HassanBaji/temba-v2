"use client";

import { useEffect, useState } from "react";

import { touchHitArea } from "~/components/ui/button";
import {
  formatCountdown,
  isResendAvailable,
  remainingSeconds,
  resendAccessibleName,
} from "@repo/domain/resend-countdown";
import { cn } from "~/lib/utils";

export function ResendCountdown({
  startedAt,
  onResend,
  disabled,
}: {
  startedAt: number;
  onResend: () => void;
  disabled?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [resendFrom, setResendFrom] = useState<number | null>(null);
  const remaining = remainingSeconds(startedAt, now);
  const available = isResendAvailable(remaining);
  // Callers restart the countdown only once the new code is on its way.
  const codeResent =
    resendFrom !== null && startedAt > resendFrom && !available;

  useEffect(() => {
    setNow(Date.now());
    if (remainingSeconds(startedAt, Date.now()) <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label={resendAccessibleName(remaining)}
          disabled={disabled === true || !available}
          onClick={() => {
            setResendFrom(startedAt);
            onResend();
          }}
          className={cn(
            touchHitArea,
            "text-meta text-foreground focus-visible:ring-ring/50 disabled:text-muted-foreground rounded-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-[3px] disabled:no-underline",
          )}
        >
          Resend code
        </button>
        <span
          aria-hidden="true"
          className="text-ink font-bold tracking-[-0.02em] [font-variation-settings:'wdth'_112,'wght'_700]"
        >
          {formatCountdown(remaining)}
        </span>
      </div>
      <p role="status" className="text-meta text-muted-foreground">
        {codeResent ? "New code sent" : null}
      </p>
    </div>
  );
}

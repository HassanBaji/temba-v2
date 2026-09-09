"use client";

import { useEffect, useState } from "react";

import {
  formatCountdown,
  isResendAvailable,
  remainingSeconds,
  resendAccessibleName,
} from "~/lib/resend-countdown";

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
  const remaining = remainingSeconds(startedAt, now);
  const available = isResendAvailable(remaining);

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
    <div className="flex items-center justify-between">
      <button
        type="button"
        aria-label={resendAccessibleName(remaining)}
        disabled={disabled === true || !available}
        onClick={onResend}
        className="text-meta text-muted-foreground disabled:opacity-100"
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
  );
}

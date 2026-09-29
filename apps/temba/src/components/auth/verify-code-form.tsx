"use client";

import { OtpInput } from "~/components/ui/otp-input";
import { Button, touchHitArea } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { ResendCountdown } from "~/components/auth/resend-countdown";
import { cn } from "~/lib/utils";

export function VerifyCodeForm({
  destination,
  changeLabel,
  onChangeIdentifier,
  code,
  onCodeChange,
  onVerify,
  onResend,
  startedAt,
  pending,
  globalMessage,
  codeError,
  codeInputId = "sign-up-code",
}: {
  destination: string;
  changeLabel: string;
  onChangeIdentifier: () => void;
  code: string;
  onCodeChange: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
  startedAt: number;
  pending: boolean;
  globalMessage: string | null;
  codeError?: string;
  codeInputId?: string;
}) {
  const ready = code.length === 6;
  const helperId = `${codeInputId}-helper`;
  const errorId = `${codeInputId}-error`;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (!ready || pending) {
          return;
        }
        onVerify();
      }}
    >
      <p className="text-body text-muted-foreground">
        Sent to {destination}.{" "}
        <button
          type="button"
          className={cn(
            touchHitArea,
            "text-ink focus-visible:ring-ring/50 rounded-sm font-medium underline outline-none focus-visible:ring-[3px]",
          )}
          onClick={onChangeIdentifier}
        >
          {changeLabel}
        </button>
      </p>
      <FormErrorSummary message={globalMessage} />
      <OtpInput
        id={codeInputId}
        value={code}
        onChange={onCodeChange}
        autoFocus
        aria-invalid={Boolean(codeError)}
        aria-describedby={codeError ? errorId : ready ? undefined : helperId}
        disabled={pending}
      />
      {codeError ? <FieldError id={errorId}>{codeError}</FieldError> : null}
      <ResendCountdown
        startedAt={startedAt}
        onResend={onResend}
        disabled={pending}
      />
      <div>
        <Button
          type="submit"
          size="lg"
          pending={ready && pending}
          pendingLabel="Verifying…"
          disabled={!ready || pending}
          className="w-full font-semibold"
        >
          Verify
        </Button>
        {ready ? null : (
          <p
            id={helperId}
            className="text-eyebrow text-muted-foreground mt-3 text-center"
          >
            Button unlocks at six digits
          </p>
        )}
      </div>
    </form>
  );
}

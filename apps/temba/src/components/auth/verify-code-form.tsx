"use client";

import { OtpInput } from "~/components/ui/otp-input";
import { Button } from "~/components/ui/button";
import { FieldError } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { ResendCountdown } from "~/components/auth/resend-countdown";

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
}) {
  const ready = code.length === 6;
  const helperId = "verify-code-helper";
  const errorId = "verify-code-error";

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
          className="text-ink font-medium underline"
          onClick={onChangeIdentifier}
        >
          {changeLabel}
        </button>
      </p>
      <FormErrorSummary message={globalMessage} />
      <OtpInput
        id="sign-up-code"
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
          size="auth"
          aria-busy={pending}
          disabled={!ready || pending}
          className={
            ready
              ? "bg-ink text-paper hover:bg-dimrule w-full font-semibold"
              : "bg-rule text-muted-foreground w-full font-semibold"
          }
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

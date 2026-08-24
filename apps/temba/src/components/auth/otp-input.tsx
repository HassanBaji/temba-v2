"use client";

import { useRef, type ClipboardEvent, type KeyboardEvent } from "react";

import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

const OTP_LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function OtpInput({
  value,
  onChange,
  disabled,
  className,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(OTP_LENGTH, " ").split("").slice(0, OTP_LENGTH);

  function updateDigit(index: number, digit: string) {
    const next = digits.map((current, i) =>
      i === index ? digit : current === " " ? "" : current,
    );
    onChange(next.join("").replace(/\s/g, ""));
  }

  function handleChange(index: number, nextValue: string) {
    const digit = nextValue.replace(/\D/g, "").slice(-1);
    if (!digit) {
      updateDigit(index, "");
      return;
    }
    updateDigit(index, digit);
    if (index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputsRef.current[focusIndex]?.focus();
  }

  return (
    <div className={cn("flex justify-center gap-2", className)}>
      {Array.from({ length: OTP_LENGTH }).map((_, index) => (
        <Input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digits[index]?.trim() ?? ""}
          className="h-12 w-10 text-center text-lg font-semibold"
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
        />
      ))}
    </div>
  );
}

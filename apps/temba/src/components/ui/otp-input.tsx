"use client";

import * as React from "react";

import { cn } from "~/lib/utils";

const LENGTH = 6;

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, LENGTH);
}

export function OtpInput({
  id,
  value,
  onChange,
  disabled,
  autoFocus,
  "aria-label": ariaLabel = "Verification code",
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const [caret, setCaret] = React.useState(0);
  const digits = digitsOnly(value);

  function syncCaret() {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    setCaret(el.selectionStart ?? digits.length);
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    onChange(digitsOnly(event.target.value));
  }

  const activeIndex = focused ? Math.min(caret, LENGTH - 1) : -1;

  return (
    <div className={cn("relative", className)}>
      <div aria-hidden="true" className="grid grid-cols-6 gap-2">
        {Array.from({ length: LENGTH }, (_, index) => {
          const char = digits[index];
          const isActive = index === activeIndex;
          const isHatched = char === undefined && !isActive;

          return (
            <div
              key={index}
              className={cn(
                "flex h-16 items-center justify-center rounded-lg",
                isActive ? "border-ink border-2" : "border-rule border",
                isHatched && "hatch",
              )}
            >
              {char !== undefined ? (
                <span className="text-[26px] font-bold leading-none tracking-[-0.02em] [font-variation-settings:'wdth'_112,'wght'_700]">
                  {char}
                </span>
              ) : isActive ? (
                <span className="bg-ink h-[26px] w-0.5" />
              ) : null}
            </div>
          );
        })}
      </div>
      <input
        ref={inputRef}
        id={id}
        value={digits}
        onChange={handleChange}
        onFocus={() => {
          setFocused(true);
          syncCaret();
        }}
        onBlur={() => setFocused(false)}
        onClick={syncCaret}
        onKeyUp={syncCaret}
        onSelect={syncCaret}
        autoComplete="one-time-code"
        inputMode="numeric"
        maxLength={LENGTH}
        pattern="[0-9]*"
        autoFocus={autoFocus}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        className="absolute inset-0 cursor-text opacity-0"
      />
    </div>
  );
}

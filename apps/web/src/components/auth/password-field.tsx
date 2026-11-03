"use client";

import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { useLocale, useMessages } from "~/components/locale-provider";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  isPasswordLongEnough,
  passwordStrength,
  passwordStrengthLabel,
  PASSWORD_STRENGTH_SEGMENTS,
} from "~/lib/password-strength";
import { cn } from "~/lib/utils";

export function PasswordField({
  id,
  name = "password",
  value,
  onChange,
  autoComplete,
  placeholder,
  invalid,
  describedBy,
  disabled,
}: {
  id: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  disabled?: boolean;
}) {
  const m = useMessages();
  const [shown, setShown] = React.useState(false);

  return (
    <InputGroup
      className={cn(
        "h-13 min-h-13 rounded-lg shadow-none",
        "has-[[data-slot=input-group-control]:focus-visible]:border-ink has-[[data-slot=input-group-control]:focus-visible]:ring-0",
        "focus-within:border-ink",
      )}
    >
      <InputGroupInput
        id={id}
        name={name}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(invalid)}
        aria-describedby={describedBy}
        disabled={disabled}
        className="h-13 min-h-13 text-base md:text-base"
      />
      <InputGroupAddon align="inline-end" className="pe-1">
        <InputGroupButton
          type="button"
          size="icon-sm"
          aria-label={shown ? m.webAuth.password.hide : m.webAuth.password.show}
          aria-pressed={shown}
          disabled={disabled}
          onClick={() => setShown((current) => !current)}
        >
          {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

/** Four thin segments under a new password, plus a spoken strength label. */
export function PasswordStrengthMeter({
  password,
  id,
}: {
  password: string;
  id?: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const filled = isPasswordLongEnough(password)
    ? passwordStrength(password)
    : 0;
  const label = passwordStrengthLabel(password, locale);
  return (
    <div id={id} className="flex flex-col gap-1.5">
      <div aria-hidden="true" className="flex gap-1.5">
        {Array.from({ length: PASSWORD_STRENGTH_SEGMENTS }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-[3px] flex-1 rounded-full",
              index < filled ? "bg-ink" : "bg-rule",
            )}
          />
        ))}
      </div>
      <p role="status" className="sr-only">
        {password.length > 0 ? m.webAuth.password.strength(label) : ""}
      </p>
    </div>
  );
}

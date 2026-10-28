"use client";

import Link from "next/link";

import { Checkbox } from "~/components/ui/checkbox";
import { TERMS_MINIMUM_AGE } from "@repo/domain/terms";

export function TermsConsent({
  id,
  agreed,
  onChange,
  termsHref,
  disabled,
}: {
  id: string;
  agreed: boolean;
  onChange: (agreed: boolean) => void;
  termsHref: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 pt-1">
      <Checkbox
        id={id}
        checked={agreed}
        disabled={disabled}
        onCheckedChange={(checked) => onChange(checked === true)}
        className="data-[state=checked]:bg-ink data-[state=checked]:border-ink mt-0.5 size-[22px] rounded-[6px] shadow-none"
      />
      <label
        htmlFor={id}
        className="text-meta text-muted-foreground leading-[1.5]"
      >
        I am {TERMS_MINIMUM_AGE} or older and agree to the{" "}
        <Link className="text-ink underline" href={termsHref}>
          Terms and Conditions
        </Link>
        , including how Temba uses my data.
      </label>
    </div>
  );
}

"use client";

import { useId } from "react";

import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { cn } from "~/lib/utils";

const COUNTRY_CODES = [{ code: "+973", label: "BH +973" }] as const;

type PhoneInputProps = {
  countryCode: string;
  onCountryCodeChange: (code: string) => void;
  number: string;
  onNumberChange: (number: string) => void;
  className?: string;
  disabled?: boolean;
  id?: string;
};

export function PhoneInput({
  countryCode,
  onCountryCodeChange,
  number,
  onNumberChange,
  className,
  disabled,
  id,
}: PhoneInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={cn("flex gap-2", className)}>
      <Select
        value={countryCode}
        onValueChange={onCountryCodeChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-[110px] shrink-0" aria-label="Country code">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COUNTRY_CODES.map((country) => (
            <SelectItem key={country.code} value={country.code}>
              {country.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        id={inputId}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="39999999"
        value={number}
        disabled={disabled}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          onNumberChange(digits);
        }}
      />
    </div>
  );
}

export function formatE164(countryCode: string, number: string): string {
  return `${countryCode}${number}`;
}

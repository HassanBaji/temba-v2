"use client";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "~/components/ui/select";
import {
  CALLING_COUNTRIES,
  DEFAULT_CALLING_COUNTRY_ISO,
  callingCountryByIso,
  countryFlagEmoji,
  formatNationalNumber,
  nationalDigits,
} from "~/lib/phone-number";
import { cn } from "~/lib/utils";

export function PhoneField({
  id,
  name,
  countryIso = DEFAULT_CALLING_COUNTRY_ISO,
  national,
  onCountryIsoChange,
  onNationalChange,
  invalid,
  disabled,
  placeholder,
  describedBy,
}: {
  id: string;
  name?: string;
  countryIso?: string;
  national: string;
  onCountryIsoChange: (iso: string) => void;
  onNationalChange: (national: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  describedBy?: string;
}) {
  const country =
    callingCountryByIso(countryIso) ??
    callingCountryByIso(DEFAULT_CALLING_COUNTRY_ISO);
  if (!country) {
    throw new Error("Default calling country is missing");
  }

  const digits = nationalDigits(national);
  const accessibleName = `Country calling code, currently ${country.name} +${country.callingCode}`;

  return (
    <InputGroup
      className={cn(
        "border-rule h-13 min-h-13 rounded-lg shadow-none",
        "has-[[data-slot=input-group-control]:focus-visible]:border-ink has-[[data-slot=input-group-control]:focus-visible]:ring-0",
        "has-[[data-slot=select-trigger]:focus-visible]:border-ink has-[[data-slot=select-trigger]:focus-visible]:ring-0",
        "focus-within:border-ink",
      )}
    >
      <InputGroupAddon
        align="inline-start"
        className="border-rule h-full cursor-default border-r py-0 pl-0 pr-0"
      >
        <Select
          value={country.iso}
          onValueChange={(iso) => {
            const next = callingCountryByIso(iso);
            onCountryIsoChange(iso);
            if (next) {
              onNationalChange(digits.slice(0, next.nationalLength));
            }
          }}
          disabled={disabled}
        >
          <SelectTrigger
            aria-label={accessibleName}
            disabled={disabled}
            className="text-ink h-13 min-h-13 data-[size=default]:h-13 data-[size=default]:min-h-13 rounded-none border-0 bg-transparent px-3.5 shadow-none focus-visible:border-0 focus-visible:ring-0 [&>svg]:size-[15px] [&>svg]:text-[#9A9A9A] [&>svg]:opacity-100"
          >
            <span className="flex items-center gap-1.5 text-base font-medium [font-variation-settings:'wdth'_100,'wght'_500]">
              <span aria-hidden="true" className="leading-none">
                {countryFlagEmoji(country.iso)}
              </span>
              +{country.callingCode}
            </span>
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            {CALLING_COUNTRIES.map((item) => (
              <SelectItem key={item.iso} value={item.iso}>
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="leading-none">
                    {countryFlagEmoji(item.iso)}
                  </span>
                  {item.name} +{item.callingCode}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </InputGroupAddon>
      <InputGroupInput
        id={id}
        name={name}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder ?? country.placeholder}
        disabled={disabled}
        aria-invalid={Boolean(invalid)}
        aria-describedby={describedBy}
        value={formatNationalNumber(country.iso, digits)}
        onChange={(event) => {
          onNationalChange(
            nationalDigits(event.target.value).slice(0, country.nationalLength),
          );
        }}
        className="h-13 min-h-13 text-base md:text-base"
      />
    </InputGroup>
  );
}

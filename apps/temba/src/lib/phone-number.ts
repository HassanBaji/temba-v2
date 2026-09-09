export type CallingCountry = {
  iso: string;
  name: string;
  callingCode: string;
  nationalLength: number;
  groups: number[];
};

/**
 * Countries the auth phone control can assemble to E.164. Default is Bahrain,
 * matching the artboards. Lengths are the national significant number, not
 * including a trunk prefix.
 */
export const CALLING_COUNTRIES: readonly CallingCountry[] = [
  {
    iso: "BH",
    name: "Bahrain",
    callingCode: "973",
    nationalLength: 8,
    groups: [4, 4],
  },
  {
    iso: "KW",
    name: "Kuwait",
    callingCode: "965",
    nationalLength: 8,
    groups: [4, 4],
  },
  {
    iso: "SA",
    name: "Saudi Arabia",
    callingCode: "966",
    nationalLength: 9,
    groups: [2, 3, 4],
  },
  {
    iso: "AE",
    name: "United Arab Emirates",
    callingCode: "971",
    nationalLength: 9,
    groups: [2, 3, 4],
  },
  {
    iso: "QA",
    name: "Qatar",
    callingCode: "974",
    nationalLength: 8,
    groups: [4, 4],
  },
  {
    iso: "OM",
    name: "Oman",
    callingCode: "968",
    nationalLength: 8,
    groups: [4, 4],
  },
  {
    iso: "EG",
    name: "Egypt",
    callingCode: "20",
    nationalLength: 10,
    groups: [3, 3, 4],
  },
  {
    iso: "IN",
    name: "India",
    callingCode: "91",
    nationalLength: 10,
    groups: [5, 5],
  },
  {
    iso: "GB",
    name: "United Kingdom",
    callingCode: "44",
    nationalLength: 10,
    groups: [4, 3, 3],
  },
  {
    iso: "US",
    name: "United States",
    callingCode: "1",
    nationalLength: 10,
    groups: [3, 3, 4],
  },
] as const;

export const DEFAULT_CALLING_COUNTRY_ISO = "BH";

export function callingCountryByIso(iso: string): CallingCountry | undefined {
  return CALLING_COUNTRIES.find((country) => country.iso === iso);
}

export function nationalDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatNationalNumber(iso: string, raw: string): string {
  const country = callingCountryByIso(iso);
  const digits = nationalDigits(raw).slice(
    0,
    country?.nationalLength ?? raw.length,
  );
  if (!country) {
    return digits;
  }
  const parts: string[] = [];
  let rest = digits;
  for (const size of country.groups) {
    if (rest.length === 0) {
      break;
    }
    parts.push(rest.slice(0, size));
    rest = rest.slice(size);
  }
  if (rest.length > 0) {
    parts.push(rest);
  }
  return parts.join(" ");
}

export type AssembleE164Result =
  | { ok: true; e164: string }
  | { ok: false; reason: "unknown_country" | "malformed" };

export function assembleE164(
  iso: string,
  rawNational: string,
): AssembleE164Result {
  const country = callingCountryByIso(iso);
  if (!country) {
    return { ok: false, reason: "unknown_country" };
  }
  const digits = nationalDigits(rawNational);
  if (digits.length !== country.nationalLength) {
    return { ok: false, reason: "malformed" };
  }
  if (!/^\d+$/.test(digits)) {
    return { ok: false, reason: "malformed" };
  }
  return { ok: true, e164: `+${country.callingCode}${digits}` };
}

export function parseE164(e164: string): {
  iso: string;
  national: string;
} | null {
  if (!e164.startsWith("+")) {
    return null;
  }
  const rest = e164.slice(1);
  const matches = CALLING_COUNTRIES.filter((country) =>
    rest.startsWith(country.callingCode),
  ).sort((a, b) => b.callingCode.length - a.callingCode.length);
  for (const country of matches) {
    const national = rest.slice(country.callingCode.length);
    if (national.length === country.nationalLength) {
      return { iso: country.iso, national };
    }
  }
  return null;
}

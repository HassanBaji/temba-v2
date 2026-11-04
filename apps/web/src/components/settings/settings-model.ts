import {
  ageGroupLabel,
  ageOn,
  birthDateProblem,
} from "@repo/domain/profile-details";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type CompletionItem =
  | "name"
  | "phone"
  | "photo"
  | "email"
  | "sports"
  | "details"
  | "playWindows";

export type ProfileCompletionInput = {
  hasName: boolean;
  hasPhone: boolean;
  hasPhoto: boolean;
  emailVerified: boolean;
  sportCount: number;
  gender: string | null;
  birthDate: string | null;
  homeArea: string | null;
  playWindowCount: number;
};

export type ProfileCompletion = {
  done: number;
  total: number;
  /** Open items in the order Settings lists them; name and phone come from sign up. */
  missing: Exclude<CompletionItem, "name" | "phone">[];
  left: string | null;
};

/** "Complete your profile": everything sign up asks for, as Settings counts it. */
export function profileCompletion(
  input: ProfileCompletionInput,
  locale: Locale,
): ProfileCompletion {
  const m = messagesFor(locale).you.settings;
  const checks: [CompletionItem, boolean][] = [
    ["name", input.hasName],
    ["phone", input.hasPhone],
    ["photo", input.hasPhoto],
    ["email", input.emailVerified],
    ["sports", input.sportCount > 0],
    [
      "details",
      input.gender !== null &&
        input.birthDate !== null &&
        input.homeArea !== null,
    ],
    ["playWindows", input.playWindowCount > 0],
  ];
  const missing = checks.flatMap(([item, done]) =>
    done || item === "name" || item === "phone" ? [] : [item],
  );
  return {
    done: checks.filter(([, done]) => done).length,
    total: checks.length,
    missing,
    left:
      missing.length === 0
        ? null
        : m.left(missing.map((item) => m.leftItems[item]).join(", ")),
  };
}

export type BirthDateParts = { day: string; month: string; year: string };

export function birthDateParts(value: string | null): BirthDateParts {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(value) : null;
  return match
    ? { year: match[1]!, month: match[2]!, day: match[3]! }
    : { day: "", month: "", year: "" };
}

export type BirthDateEntry =
  | { kind: "empty" }
  | { kind: "date"; value: string }
  | { kind: "problem"; problem: "invalid" | "tooYoung" };

/** Day, month and year as typed, read as a stored `YYYY-MM-DD` or a problem. */
export function birthDateEntry(
  parts: BirthDateParts,
  today: string,
): BirthDateEntry {
  const day = parts.day.trim();
  const month = parts.month.trim();
  const year = parts.year.trim();
  if (day === "" && month === "" && year === "") {
    return { kind: "empty" };
  }
  if (
    !/^\d{1,2}$/.test(day) ||
    !/^\d{1,2}$/.test(month) ||
    !/^\d{4}$/.test(year)
  ) {
    return { kind: "problem", problem: "invalid" };
  }
  const value = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const problem = birthDateProblem(value, today);
  return problem ? { kind: "problem", problem } : { kind: "date", value };
}

/** "others see 25 to 34 only", once the date is a real one. */
export function othersSeeLabel(
  entry: BirthDateEntry,
  today: string,
  locale: Locale,
): string | null {
  if (entry.kind !== "date") {
    return null;
  }
  const m = messagesFor(locale).you.details;
  return m.othersSee(ageGroupLabel(ageOn(entry.value, today), locale));
}

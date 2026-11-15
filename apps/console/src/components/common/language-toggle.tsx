"use client";

import { LOCALE_LABELS, LOCALES, type Locale } from "@repo/i18n/locale";
import { useLocaleSwitch, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

/**
 * Two-way switch between English and Arabic. Each option is written in its
 * own language so a reader of either can find theirs.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const m = useMessages();
  const { locale, setLocale, switching } = useLocaleSwitch();

  return (
    <div
      role="radiogroup"
      aria-label={m.common.language}
      className={cn(
        "border-rule bg-paper inline-flex h-9 items-stretch overflow-hidden rounded-md border",
        className,
      )}
    >
      {LOCALES.map((option: Locale) => {
        const selected = option === locale;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            lang={option}
            aria-checked={selected}
            disabled={switching}
            onClick={() => {
              if (!selected) {
                setLocale(option);
              }
            }}
            className={cn(
              "text-meta focus-visible:ring-ring/50 min-w-[72px] px-3 font-semibold outline-none transition-colors focus-visible:ring-[3px] disabled:opacity-60",
              selected
                ? "bg-control text-on-control"
                : "text-ink hover:bg-wash",
            )}
          >
            {LOCALE_LABELS[option]}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { Languages } from "lucide-react";

import { LOCALE_LABELS, LOCALES, type Locale } from "@repo/i18n/locale";
import { useLocaleSwitch, useMessages } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

const TITLE_ID = "language-title";

/**
 * Settings card for the app language, styled like the Preferred Position
 * control. Each option is written in its own language so a reader of either
 * can find theirs.
 */
export function LanguageControl() {
  const m = useMessages();
  const { locale, setLocale, switching } = useLocaleSwitch();

  return (
    <div className="px-5 pb-5 pt-[18px]">
      <div className="flex items-start justify-between gap-3.5">
        <div className="min-w-0">
          <h3 id={TITLE_ID} className="text-ink text-lead font-semibold">
            {m.webAuth.settings.language.title}
          </h3>
          <p className="text-muted-foreground text-meta mt-[3px] leading-[1.45]">
            {m.webAuth.settings.language.description}
          </p>
        </div>
        <Languages
          aria-hidden="true"
          className="text-muted-foreground mt-0.5 size-5 shrink-0"
          strokeWidth={2}
        />
      </div>

      <RovingRadioGroup
        aria-labelledby={TITLE_ID}
        aria-disabled={switching || undefined}
        className="bg-wash mt-4 grid grid-cols-2 gap-1.5 rounded-lg p-[5px]"
      >
        {LOCALES.map((option: Locale) => {
          const isSelected = option === locale;

          return (
            <button
              key={option}
              type="button"
              role="radio"
              lang={option}
              aria-checked={isSelected}
              aria-disabled={switching || undefined}
              className={cn(
                "focus-visible:ring-ring/50 text-body min-h-11 w-full rounded-sm outline-none focus-visible:ring-[3px] aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
                isSelected
                  ? "bg-ink text-paper font-semibold"
                  : "text-muted-foreground hover:text-ink bg-transparent",
              )}
              onClick={() => {
                if (!switching && !isSelected) {
                  setLocale(option);
                }
              }}
            >
              {LOCALE_LABELS[option]}
            </button>
          );
        })}
      </RovingRadioGroup>
    </div>
  );
}

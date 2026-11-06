"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { useMessages } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

const TITLE_ID = "appearance-title";
const THEMES = ["system", "light", "dark"] as const;
type Theme = (typeof THEMES)[number];

function isTheme(value: string | undefined): value is Theme {
  return THEMES.some((theme) => theme === value);
}

/**
 * Appearance is stored per device (next-themes keeps it in localStorage), so a
 * phone and a laptop can differ. The choice is unknown until hydration, so no
 * radio is checked on the server render.
 */
export function AppearanceControl() {
  const m = useMessages();
  const copy = m.you.settings.appearance;
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const selected = mounted && isTheme(theme) ? theme : null;
  const options: Record<Theme, { title: string; hint: string }> = {
    system: { title: copy.system, hint: copy.systemHint },
    light: { title: copy.light, hint: copy.lightHint },
    dark: { title: copy.dark, hint: copy.darkHint },
  };

  return (
    <div>
      <h3 id={TITLE_ID} className="sr-only">
        {copy.title}
      </h3>
      <RovingRadioGroup aria-labelledby={TITLE_ID} className="flex flex-col">
        {THEMES.map((option) => {
          const isSelected = option === selected;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className="border-rule focus-visible:ring-ring/50 hover:bg-wash flex min-h-[62px] w-full items-center gap-4 border-b px-5 py-3 text-start outline-none last:border-b-0 focus-visible:ring-[3px] focus-visible:ring-inset"
              onClick={() => setTheme(option)}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-[22px] shrink-0 items-center justify-center rounded-full border-2",
                  isSelected ? "border-ink" : "border-input",
                )}
              >
                {isSelected ? (
                  <span className="bg-ink size-2.5 rounded-full" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="text-ink text-body block font-semibold">
                  {options[option].title}
                </span>
                <span className="text-muted-foreground text-meta block">
                  {options[option].hint}
                </span>
              </span>
            </button>
          );
        })}
      </RovingRadioGroup>
    </div>
  );
}

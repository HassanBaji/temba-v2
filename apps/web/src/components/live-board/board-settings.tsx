"use client";

import * as React from "react";

import {
  LIVE_BOARD_ROTATE_SECONDS,
  LIVE_BOARD_COLOR_SCHEMES,
  type LiveBoardColorScheme,
} from "@repo/domain/live-board";

import { useMessages } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

/** One bordered block of setting rows, the way the sheet and the control list them. */
export function SettingsBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-rule divide-rule rounded-card divide-y overflow-hidden border">
      {children}
    </div>
  );
}

export function SettingRow({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[58px] items-center gap-3.5 px-[18px] py-3">
      <div className="min-w-0 flex-1">
        <p className="text-body">{title}</p>
        {hint ? (
          <p className="text-muted-foreground text-eyebrow mt-0.5">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function SwitchRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <SettingRow hint={hint} title={title}>
      <Switch aria-label={title} checked={checked} onCheckedChange={onChange} />
    </SettingRow>
  );
}

export function ColorSchemeSegments({
  value,
  onSelect,
}: {
  value: LiveBoardColorScheme;
  onSelect: (colorScheme: LiveBoardColorScheme) => void;
}) {
  const m = useMessages().liveBoard.settings;
  return (
    <RovingRadioGroup
      aria-label={m.colorScheme}
      className="bg-wash grid flex-none grid-cols-2 gap-[3px] rounded-[10px] p-[3px]"
    >
      {LIVE_BOARD_COLOR_SCHEMES.map((colorScheme) => {
        const selected = colorScheme === value;
        return (
          <button
            key={colorScheme}
            aria-checked={selected}
            className={cn(
              "text-meta focus-visible:ring-ring/50 h-[34px] rounded-md px-3 outline-none focus-visible:ring-[3px]",
              selected
                ? "bg-control text-on-control font-semibold"
                : "text-muted-foreground hover:text-ink",
            )}
            onClick={() => onSelect(colorScheme)}
            role="radio"
            type="button"
          >
            {m[colorScheme]}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}

export function SecondsSegments({
  value,
  onSelect,
}: {
  value: number;
  onSelect: (seconds: number) => void;
}) {
  const m = useMessages().liveBoard.control;
  return (
    <RovingRadioGroup
      aria-label={m.changeEvery}
      className="flex flex-none gap-1.5"
    >
      {LIVE_BOARD_ROTATE_SECONDS.map((seconds) => {
        const selected = seconds === value;
        return (
          <button
            key={seconds}
            aria-checked={selected}
            aria-label={m.secondsLabel(seconds)}
            className={cn(
              "text-meta focus-visible:ring-ring/50 h-[38px] min-w-[52px] rounded-md border px-2 font-semibold outline-none focus-visible:ring-[3px]",
              selected
                ? "bg-control text-on-control border-control"
                : "border-rule text-ink",
            )}
            onClick={() => onSelect(seconds)}
            role="radio"
            type="button"
          >
            {m.seconds(seconds)}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}

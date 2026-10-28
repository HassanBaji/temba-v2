"use client";

import { Check } from "lucide-react";
import type * as React from "react";

import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

function choiceClass(selected: boolean) {
  return cn(
    "focus-visible:ring-ring/50 min-h-11 border text-left outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
    selected
      ? "border-ink bg-ink text-paper"
      : "border-rule bg-paper text-ink hover:bg-wash",
  );
}

function mutedClass(selected: boolean) {
  return selected ? "text-dim" : "text-muted-foreground";
}

/** Equal-width tiles with a name and a short line under it, such as Left / backhand side. */
export function TileChoices<T extends string>(props: {
  label: string;
  choices: { value: T; name: string; detail?: string; mono?: boolean }[];
  value: T;
  onSelect: (value: T) => void;
}) {
  return (
    <RovingRadioGroup aria-label={props.label} className="flex gap-2">
      {props.choices.map((choice) => {
        const selected = choice.value === props.value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => props.onSelect(choice.value)}
            className={cn(
              choiceClass(selected),
              "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-2 py-2 text-center",
            )}
          >
            <span
              className={
                choice.mono ? "text-meta font-mono" : "text-body font-semibold"
              }
            >
              {choice.name}
            </span>
            {choice.detail ? (
              <span className={cn("text-eyebrow", mutedClass(selected))}>
                {choice.detail}
              </span>
            ) : null}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}

/** A compact list row: a bold mark, a name, and a short line under it. */
export function RowChoices<T extends string>(props: {
  label: string;
  choices: { value: T; mark?: string; name: string; detail: string }[];
  value: T | "";
  onSelect: (value: T) => void;
}) {
  return (
    <RovingRadioGroup
      aria-label={props.label}
      className="flex flex-col gap-1.5"
    >
      {props.choices.map((choice) => {
        const selected = choice.value === props.value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => props.onSelect(choice.value)}
            className={cn(
              choiceClass(selected),
              "flex items-center gap-3 rounded-md px-3.5 py-2.5",
            )}
          >
            {choice.mark ? (
              <span className="text-title w-[34px] shrink-0 font-bold tracking-[-0.03em] [font-variation-settings:'wdth'_116,'wght'_700]">
                {choice.mark}
              </span>
            ) : null}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-meta font-semibold">{choice.name}</span>
              <span className={cn("text-eyebrow", mutedClass(selected))}>
                {choice.detail}
              </span>
            </span>
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}

/** A large card that toggles or selects, with a check when chosen. */
export function CardChoice(props: {
  role: "radio" | "checkbox";
  selected: boolean;
  title: string;
  description: string;
  meta?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role={props.role}
      aria-checked={props.selected}
      onClick={props.onSelect}
      className={cn(
        choiceClass(props.selected),
        "flex w-full items-start gap-4 rounded-[14px] px-5 py-4",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-lead font-semibold">{props.title}</span>
        <span className={cn("text-meta", mutedClass(props.selected))}>
          {props.description}
        </span>
        {props.meta ? (
          <span
            className={cn(
              "text-eyebrow mt-1.5 font-mono uppercase",
              mutedClass(props.selected),
            )}
          >
            {props.meta}
          </span>
        ) : null}
      </span>
      {props.selected ? (
        <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      ) : null}
    </button>
  );
}

export function SectionLabel(props: { label: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-meta text-muted-foreground">{props.label}</span>
      {props.hint ? (
        <span className="text-eyebrow text-muted-foreground">{props.hint}</span>
      ) : null}
    </div>
  );
}

export function Group(props: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2.5">{props.children}</div>;
}

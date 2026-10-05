"use client";

import * as React from "react";

import {
  rovingRadioIndex,
  rovingTabStopIndex,
} from "@repo/domain/roving-radio";

function ownRadios(group: HTMLElement) {
  return Array.from(
    group.querySelectorAll<HTMLElement>('[role="radio"]'),
  ).filter((radio) => radio.closest('[role="radiogroup"]') === group);
}

function isEnabled(radio: HTMLElement) {
  return (
    !radio.hasAttribute("disabled") &&
    radio.getAttribute("aria-disabled") !== "true"
  );
}

function isChecked(radio: HTMLElement) {
  return radio.getAttribute("aria-checked") === "true";
}

/**
 * A `role="radiogroup"` with one tab stop: the checked radio (or the first
 * enabled one) is tabbable, arrows move and select, Home/End jump. Radios are
 * any descendant `role="radio"` elements, so callers keep their own chips.
 */
export function RovingRadioGroup({
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<"div">, "role" | "ref">) {
  const groupRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const group = groupRef.current;
    if (!group) {
      return;
    }
    const radios = ownRadios(group);
    const stop = rovingTabStopIndex(
      radios.map((radio) => ({
        checked: isChecked(radio),
        enabled: isEnabled(radio),
        focusable: !radio.hasAttribute("disabled"),
      })),
    );
    radios.forEach((radio, index) => {
      radio.tabIndex = index === stop ? 0 : -1;
    });
  });

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    const group = event.currentTarget;
    const radios = ownRadios(group).filter(isEnabled);
    const target = event.target as HTMLElement;
    const focusedIndex = radios.indexOf(target);
    if (focusedIndex === -1 && target !== group) {
      return;
    }
    const currentIndex =
      focusedIndex === -1 ? radios.findIndex(isChecked) : focusedIndex;
    const nextIndex = rovingRadioIndex(event.key, currentIndex, radios.length);
    const next = nextIndex == null ? undefined : radios[nextIndex];
    if (!next) {
      return;
    }
    event.preventDefault();
    next.focus();
    if (!isChecked(next)) {
      next.click();
    }
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
}

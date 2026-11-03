import type { GroupLeaderboardEntryData } from "@repo/domain/group-data";
import {
  clampLevelTenths,
  LEVEL_OVERRIDE_REASONS,
  levelOverrideReasonLabel,
  levelSliderLabel,
  type LevelOverrideReason,
} from "@repo/domain/level-slider";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { firstName } from "./group-home-model";
import { groupPath } from "./groups-model";

/** A member with no Rating starts from the default placement, Level 3.0. */
const DEFAULT_CURRENT_TENTHS = 30;

export type SetLevelView = {
  userId: string;
  name: string;
  currentTenths: number;
  wasLabel: string;
  alreadyConfirmed: boolean;
  note: string;
};

export function setLevelView(
  entry: GroupLeaderboardEntryData,
  locale: Locale,
): SetLevelView {
  const m = messagesFor(locale).mobileGroup;
  const name = entry.name ?? m.unnamedMember;
  const currentTenths = entry.level
    ? clampLevelTenths(Number(entry.level) * 10)
    : DEFAULT_CURRENT_TENTHS;
  const note = [
    m.setLevel.note,
    entry.levelProvisional
      ? m.setLevel.noteProvisional(firstName(name))
      : null,
  ]
    .filter(Boolean)
    .join(" ");
  return {
    userId: entry.userId,
    name,
    currentTenths,
    wasLabel: entry.level
      ? m.setLevel.was(levelSliderLabel(currentTenths))
      : m.setLevel.noLevelYet,
    alreadyConfirmed: entry.level !== null && !entry.levelProvisional,
    note,
  };
}

export function setLevelUnchanged(view: SetLevelView, tenths: number) {
  return view.alreadyConfirmed && tenths === view.currentTenths;
}

export function setLevelConfirmLabel(tenths: number, locale: Locale) {
  return messagesFor(locale).mobileGroup.setLevel.confirm(
    levelSliderLabel(tenths),
  );
}

export function setLevelPath(groupId: string, userId: string) {
  return `/groups/set-level?groupId=${encodeURIComponent(groupId)}&userId=${encodeURIComponent(userId)}`;
}

export type SavedLevel = {
  name: string;
  levelLabel: string;
  reason: LevelOverrideReason | null;
};

export type SavedLevelParams = {
  savedName?: string | string[];
  savedLevel?: string | string[];
  savedReason?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function savedLevelPath(groupId: string, saved: SavedLevel) {
  const query = [
    `savedName=${encodeURIComponent(saved.name)}`,
    `savedLevel=${encodeURIComponent(saved.levelLabel)}`,
    saved.reason ? `savedReason=${saved.reason}` : null,
  ]
    .filter(Boolean)
    .join("&");
  return `${groupPath(groupId)}?${query}`;
}

export function savedLevelFromParams(
  params: SavedLevelParams,
): SavedLevel | null {
  const name = firstParam(params.savedName);
  const levelLabel = firstParam(params.savedLevel);
  if (!name || !levelLabel) {
    return null;
  }
  const reason = firstParam(params.savedReason);
  return {
    name,
    levelLabel,
    reason: LEVEL_OVERRIDE_REASONS.find((option) => option === reason) ?? null,
  };
}

export function savedLevelText(saved: SavedLevel, locale: Locale) {
  const m = messagesFor(locale).mobileGroup.setLevel;
  const reason = saved.reason
    ? levelOverrideReasonLabel(saved.reason, locale)
    : null;
  return {
    headline: m.savedHeadline(saved.name, saved.levelLabel),
    reason: reason
      ? m.savedReason(`${reason.charAt(0).toLowerCase()}${reason.slice(1)}`)
      : null,
  };
}

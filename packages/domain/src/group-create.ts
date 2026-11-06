import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type GroupCreateType = "public" | "private";

export function groupCreateCopy(locale: Locale) {
  return messagesFor(locale).group.create;
}

export function groupCreateRequiresApproval(
  type: GroupCreateType,
  requiresApproval: boolean,
) {
  return type === "public" && requiresApproval;
}

/** A new Group is always Loose; a Venue links it later by Group link request. */
export function groupCreateDoor(type: GroupCreateType) {
  return type === "private" ? "createLoosePrivate" : "createLoosePublic";
}

export type GroupCreateDoor = ReturnType<typeof groupCreateDoor>;

export function groupCreateCanSubmit(name: string) {
  return name.trim().length > 0;
}

/** The Create button names the Group once it has a name. */
export function groupCreateSubmitLabel(name: string, locale: Locale) {
  const m = messagesFor(locale).group.create;
  const trimmed = name.trim();
  return trimmed ? m.submitNamed(trimmed) : m.submit;
}

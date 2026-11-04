import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type GroupCreateType = "public" | "private";

export type GroupCreateContext = "loose" | "club";

export function groupCreateCopy(context: GroupCreateContext, locale: Locale) {
  return messagesFor(locale).group.create[context];
}

export function groupCreateRequiresApproval(
  type: GroupCreateType,
  requiresApproval: boolean,
) {
  return type === "public" && requiresApproval;
}

export function groupCreateDoor(
  context: GroupCreateContext,
  type: GroupCreateType,
) {
  if (context === "club") {
    return type === "private" ? "createClubPrivate" : "createClubPublic";
  }
  return type === "private" ? "createLoosePrivate" : "createLoosePublic";
}

export type GroupCreateDoor = ReturnType<typeof groupCreateDoor>;

export function groupCreateCanSubmit(name: string) {
  return name.trim().length > 0;
}

/** The Create button names the Group once it has a name. */
export function groupCreateSubmitLabel(
  context: GroupCreateContext,
  name: string,
  locale: Locale,
) {
  const m = messagesFor(locale).group.create;
  const trimmed = name.trim();
  return trimmed ? m.submitNamed(trimmed) : m[context].submit;
}

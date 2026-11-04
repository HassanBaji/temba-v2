import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type TeamAvatarMember = {
  name: string;
  image?: string | null;
};

export function teamAvatarPeople(members: TeamAvatarMember[], locale: Locale) {
  const fallback = messagesFor(locale).team.memberFallback;
  return members.map((member) => ({
    name: member.name.length > 0 ? member.name : fallback,
    image: member.image ?? null,
  }));
}

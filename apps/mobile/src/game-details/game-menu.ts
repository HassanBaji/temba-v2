import type {
  FriendlyGameFooterAction,
  FriendlyGameFooterActionKind,
} from "@repo/domain/friendly-game-actions";
import type { FriendlyGameOrganizerPlan } from "@repo/domain/friendly-game-organizer";
import {
  closeRegistrationAction,
  closeRegistrationConsequence,
  completeMatchAction,
  completeMatchConsequence,
  reopenRegistrationAction,
} from "@repo/domain/game-copy";
import type { Locale } from "@repo/i18n/locale";
import type { Messages } from "@repo/i18n/messages";
import {
  CalendarX,
  CircleCheck,
  CircleX,
  Flag,
  Lock,
  LockOpen,
  LogOut,
  MapPin,
  Pencil,
  UserPlus,
} from "lucide-react-native";

import type { PlayedMenuItem } from "../played-game/played-menu-sheet";
import type { OrganizerHandlers } from "./organizer-card";

const FOOTER_ICONS: Record<
  FriendlyGameFooterActionKind,
  NonNullable<PlayedMenuItem["icon"]>
> = {
  edit: Pencil,
  cancel_game: CircleX,
  mark_as_not_played: CalendarX,
  report_wrong_score: Flag,
  report_wrong_score_locked: Flag,
  leave_game: LogOut,
};

const DESTRUCTIVE: readonly FriendlyGameFooterActionKind[] = [
  "cancel_game",
  "leave_game",
];

/** Everything behind the hero's ⋮: the Organizer's tools, then edit, cancel and leave. */
export function gameMenuItems({
  plan,
  handlers,
  footerActions,
  onFooterAction,
  messages,
  locale,
}: {
  plan: FriendlyGameOrganizerPlan | null;
  handlers: OrganizerHandlers | null;
  footerActions: FriendlyGameFooterAction[];
  onFooterAction: (kind: FriendlyGameFooterActionKind) => void;
  messages: Messages;
  locale: Locale;
}): PlayedMenuItem[] {
  const items: PlayedMenuItem[] = [];
  const organizer = messages.mobileGameDetails.organizer;

  if (plan && handlers) {
    const completeMatchId = plan.completeMatchId;
    items.push({
      key: "registration",
      label:
        plan.registration === "close"
          ? closeRegistrationAction(locale)
          : reopenRegistrationAction(locale),
      hint:
        plan.registration === "close"
          ? closeRegistrationConsequence(locale)
          : undefined,
      icon: plan.registration === "close" ? Lock : LockOpen,
      disabled: handlers.registrationPending,
      onPress: handlers.onToggleRegistration,
    });
    if (plan.canAddPlayer) {
      items.push({
        key: "add_player",
        label: messages.group.addPlayer.action,
        hint: messages.group.addPlayer.menuHint,
        icon: UserPlus,
        onPress: handlers.onAddPlayer,
      });
    }
    if (plan.court) {
      items.push({
        key: "court",
        label: organizer.changeCourt,
        hint: plan.court.courtName ?? organizer.noCourt,
        icon: MapPin,
        onPress: handlers.onChooseCourt,
      });
    }
    if (completeMatchId) {
      items.push({
        key: "complete",
        label: completeMatchAction(locale),
        hint: completeMatchConsequence(locale),
        icon: CircleCheck,
        disabled: handlers.completePending,
        onPress: () => handlers.onComplete(completeMatchId),
      });
    }
  }

  for (const action of footerActions) {
    items.push({
      key: action.kind,
      label: action.label,
      hint: action.consequence,
      icon: FOOTER_ICONS[action.kind],
      disabled: !action.enabled,
      tone: DESTRUCTIVE.includes(action.kind) ? "danger" : "default",
      onPress: () => onFooterAction(action.kind),
    });
  }

  return items;
}

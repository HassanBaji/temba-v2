import {
  ADD_PLAYER_ACTION,
  ADD_PLAYER_DESCRIPTION,
} from "@repo/domain/add-player-by-phone";
import type {
  FriendlyGameFooterAction,
  FriendlyGameFooterActionKind,
} from "@repo/domain/friendly-game-actions";
import type { FriendlyGameOrganizerPlan } from "@repo/domain/friendly-game-organizer";
import {
  CLOSE_REGISTRATION_ACTION,
  COMPLETE_MATCH_ACTION,
  COMPLETE_MATCH_CONSEQUENCE,
  REOPEN_REGISTRATION_ACTION,
} from "@repo/domain/game-copy";
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
}: {
  plan: FriendlyGameOrganizerPlan | null;
  handlers: OrganizerHandlers | null;
  footerActions: FriendlyGameFooterAction[];
  onFooterAction: (kind: FriendlyGameFooterActionKind) => void;
}): PlayedMenuItem[] {
  const items: PlayedMenuItem[] = [];

  if (plan && handlers) {
    const completeMatchId = plan.completeMatchId;
    items.push({
      key: "registration",
      label:
        plan.registration === "close"
          ? CLOSE_REGISTRATION_ACTION
          : REOPEN_REGISTRATION_ACTION,
      icon: plan.registration === "close" ? Lock : LockOpen,
      disabled: handlers.registrationPending,
      onPress: handlers.onToggleRegistration,
    });
    if (plan.canAddPlayer) {
      items.push({
        key: "add_player",
        label: ADD_PLAYER_ACTION,
        hint: ADD_PLAYER_DESCRIPTION,
        icon: UserPlus,
        onPress: handlers.onAddPlayer,
      });
    }
    if (plan.court) {
      items.push({
        key: "court",
        label: "Change Court",
        hint: plan.court.courtName ?? "No Court",
        icon: MapPin,
        onPress: handlers.onChooseCourt,
      });
    }
    if (completeMatchId) {
      items.push({
        key: "complete",
        label: COMPLETE_MATCH_ACTION,
        hint: COMPLETE_MATCH_CONSEQUENCE,
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

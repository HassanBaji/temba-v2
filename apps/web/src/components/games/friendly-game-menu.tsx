"use client";

import {
  Ban,
  CalendarXIcon,
  FlagIcon,
  LockIcon,
  LockOpenIcon,
  LogOutIcon,
  PencilIcon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react";

import {
  ACTION_MENU_INK_BOXED_TRIGGER,
  ACTION_MENU_PAPER_BOXED_TRIGGER,
} from "~/components/common/action-menu";
import {
  GameActionsSheet,
  type GameActionsSheetRow,
} from "~/components/games/game-actions-sheet";
import { ADD_PLAYER_ACTION } from "@repo/domain/add-player-by-phone";
import type {
  FriendlyGameFooterAction,
  FriendlyGameFooterActionKind,
} from "@repo/domain/friendly-game-actions";
import type { FriendlyGameOverflowItem } from "@repo/domain/friendly-game-cta";
import {
  CLOSE_REGISTRATION_ACTION,
  REOPEN_REGISTRATION_ACTION,
} from "@repo/domain/game-copy";

const DESTRUCTIVE: readonly FriendlyGameFooterActionKind[] = [
  "cancel_game",
  "leave_game",
];

const FOOTER_ICONS: Record<FriendlyGameFooterActionKind, LucideIcon> = {
  edit: PencilIcon,
  cancel_game: Ban,
  mark_as_not_played: CalendarXIcon,
  report_wrong_score: FlagIcon,
  report_wrong_score_locked: FlagIcon,
  leave_game: LogOutIcon,
};

/**
 * Everything behind the hero's ⋮: registration and adding a player, then
 * edit, cancel and leave, then leaving the waitlist.
 */
export function FriendlyGameMenu({
  title,
  overflowItems,
  footerActions,
  ink,
  closePending,
  reopenPending,
  onCloseRegistration,
  onReopenRegistration,
  onAddPlayer,
  onFooterAction,
  onLeaveWaitlist,
}: {
  title: string;
  overflowItems: FriendlyGameOverflowItem[];
  footerActions: FriendlyGameFooterAction[];
  ink: boolean;
  closePending: boolean;
  reopenPending: boolean;
  onCloseRegistration: () => void;
  onReopenRegistration: () => void;
  onAddPlayer?: () => void;
  onFooterAction: (kind: FriendlyGameFooterActionKind) => void;
  onLeaveWaitlist: () => void;
}) {
  const tools: GameActionsSheetRow[] = [];
  if (overflowItems.includes("close_registration")) {
    tools.push({
      key: "close_registration",
      label: CLOSE_REGISTRATION_ACTION,
      icon: LockIcon,
      disabled: closePending,
      onSelect: onCloseRegistration,
    });
  }
  if (overflowItems.includes("reopen_registration")) {
    tools.push({
      key: "reopen_registration",
      label: REOPEN_REGISTRATION_ACTION,
      icon: LockOpenIcon,
      disabled: reopenPending,
      onSelect: onReopenRegistration,
    });
  }
  if (onAddPlayer) {
    tools.push({
      key: "add_player",
      label: ADD_PLAYER_ACTION,
      icon: UserPlusIcon,
      onSelect: onAddPlayer,
    });
  }

  const footer = footerActions.map(
    (action): GameActionsSheetRow => ({
      key: action.kind,
      label: action.label,
      hint: action.consequence,
      icon: FOOTER_ICONS[action.kind],
      disabled: !action.enabled,
      tone: DESTRUCTIVE.includes(action.kind) ? "danger" : "default",
      onSelect: () => onFooterAction(action.kind),
    }),
  );

  const waitlist: GameActionsSheetRow[] = overflowItems.includes(
    "leave_waitlist",
  )
    ? [
        {
          key: "leave_waitlist",
          label: "Leave waitlist",
          icon: LogOutIcon,
          tone: "danger",
          onSelect: onLeaveWaitlist,
        },
      ]
    : [];

  return (
    <GameActionsSheet
      title={title}
      triggerClassName={
        ink ? ACTION_MENU_INK_BOXED_TRIGGER : ACTION_MENU_PAPER_BOXED_TRIGGER
      }
      groups={[tools, footer, waitlist]}
    />
  );
}

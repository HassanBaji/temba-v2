"use client";

import {
  ACTION_MENU_INK_BOXED_TRIGGER,
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from "~/components/common/action-menu";
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

/**
 * Everything behind the hero's ⋮: registration and adding a player, then
 * edit, cancel and leave, then leaving the waitlist.
 */
export function FriendlyGameMenu({
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
  const closes = overflowItems.includes("close_registration");
  const reopens = overflowItems.includes("reopen_registration");
  const leavesWaitlist = overflowItems.includes("leave_waitlist");
  const tools = closes || reopens || onAddPlayer != null;

  if (!tools && footerActions.length === 0 && !leavesWaitlist) {
    return null;
  }

  return (
    <ActionMenu
      label="Game actions"
      triggerClassName={ink ? ACTION_MENU_INK_BOXED_TRIGGER : undefined}
    >
      {closes ? (
        <ActionMenuItem disabled={closePending} onSelect={onCloseRegistration}>
          {CLOSE_REGISTRATION_ACTION}
        </ActionMenuItem>
      ) : null}
      {reopens ? (
        <ActionMenuItem
          disabled={reopenPending}
          onSelect={onReopenRegistration}
        >
          {REOPEN_REGISTRATION_ACTION}
        </ActionMenuItem>
      ) : null}
      {onAddPlayer ? (
        <ActionMenuItem onSelect={onAddPlayer}>
          {ADD_PLAYER_ACTION}
        </ActionMenuItem>
      ) : null}
      {tools && footerActions.length > 0 ? <ActionMenuSeparator /> : null}
      {footerActions.map((action) => (
        <ActionMenuItem
          key={action.kind}
          disabled={!action.enabled}
          variant={
            DESTRUCTIVE.includes(action.kind) ? "destructive" : "default"
          }
          onSelect={() => onFooterAction(action.kind)}
        >
          <span className="flex flex-col">
            <span>{action.label}</span>
            {action.consequence ? (
              <span className="text-muted-foreground text-meta">
                {action.consequence}
              </span>
            ) : null}
          </span>
        </ActionMenuItem>
      ))}
      {leavesWaitlist ? (
        <>
          {tools || footerActions.length > 0 ? <ActionMenuSeparator /> : null}
          <ActionMenuItem variant="destructive" onSelect={onLeaveWaitlist}>
            Leave waitlist
          </ActionMenuItem>
        </>
      ) : null}
    </ActionMenu>
  );
}

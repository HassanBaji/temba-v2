"use client";

import {
  CalendarRangeIcon,
  ImageIcon,
  ImageOffIcon,
  LinkIcon,
  LogOutIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UnlinkIcon,
  UserRoundPlusIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { useState, type RefObject } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { SheetMenu, SheetMenuRow } from "~/components/common/sheet-menu";
import type { GroupHomeOverflowItem } from "@repo/domain/group-home-cta";
import { groupLeaveVenueActionLabel } from "@repo/domain/group-link-request";
import { GROUP_MENU_LABELS } from "@repo/domain/group-settings";
import { groupEditHref, groupSeasonsHref } from "~/lib/dashboard-paths";

const DESTRUCTIVE: ReadonlySet<GroupHomeOverflowItem> = new Set([
  "leave_venue_community",
  "leave",
  "delete",
]);

type Row = {
  label: string;
  icon: LucideIcon;
  href?: string;
  onSelect?: () => void;
};

/** The More menu on Group home (design "Group create and edit flow" 02). */
export function GroupHomeOverflowMenu({
  items,
  groupId,
  groupName,
  roleLine,
  communityId,
  communityName,
  venueName,
  triggerRef,
  onCopyGroupUrl,
  onManageInvites,
  onChangeImage,
  onRemoveImage,
  onLeaveVenueCommunity,
  onLeave,
  onDelete,
}: {
  items: GroupHomeOverflowItem[];
  groupId: string;
  groupName: string;
  roleLine: string | null;
  communityId: string | null;
  communityName: string | null;
  venueName: string | null;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  onCopyGroupUrl: () => void;
  onManageInvites: () => void;
  onChangeImage: () => void;
  onRemoveImage: () => void;
  onLeaveVenueCommunity: () => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const rowFor = (item: GroupHomeOverflowItem): Row | null => {
    switch (item) {
      case "edit":
        return {
          label: GROUP_MENU_LABELS.edit,
          icon: PencilIcon,
          href: groupEditHref(groupId),
        };
      case "open_community":
        return communityId
          ? {
              label: `Open ${communityName ?? "Community"}`,
              icon: UsersIcon,
              href: `/dashboard/communities/${communityId}`,
            }
          : null;
      case "all_communities":
        return {
          label: "All Communities",
          icon: UsersIcon,
          href: "/dashboard/communities",
        };
      case "create_game":
        return {
          label: "Create Game",
          icon: PlusIcon,
          href: `/dashboard/games/new?groupId=${groupId}`,
        };
      case "copy_group_url":
        return {
          label: GROUP_MENU_LABELS.copy_link,
          icon: LinkIcon,
          onSelect: onCopyGroupUrl,
        };
      case "manage_invites":
        return {
          label: GROUP_MENU_LABELS.invite,
          icon: UserRoundPlusIcon,
          onSelect: onManageInvites,
        };
      case "change_image":
        return {
          label: "Change image",
          icon: ImageIcon,
          onSelect: onChangeImage,
        };
      case "remove_image":
        return {
          label: "Remove image",
          icon: ImageOffIcon,
          onSelect: onRemoveImage,
        };
      case "seasons":
        return {
          label: "Seasons",
          icon: CalendarRangeIcon,
          href: groupSeasonsHref(groupId),
        };
      case "leave_venue_community":
        return venueName
          ? {
              label: groupLeaveVenueActionLabel(venueName),
              icon: UnlinkIcon,
              onSelect: onLeaveVenueCommunity,
            }
          : null;
      case "leave":
        return {
          label: GROUP_MENU_LABELS.leave,
          icon: LogOutIcon,
          onSelect: onLeave,
        };
      case "delete":
        return { label: "Delete Group", icon: Trash2Icon, onSelect: onDelete };
    }
  };

  const groups = [
    items.filter((item) => !DESTRUCTIVE.has(item)),
    items.filter((item) => DESTRUCTIVE.has(item)),
  ]
    .map((list) =>
      list.flatMap((item) => {
        const row = rowFor(item);
        return row ? [{ item, ...row }] : [];
      }),
    )
    .filter((list) => list.length > 0);

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Group actions"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="bg-wash text-ink hover:bg-rule focus-visible:ring-ring/50 inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]"
      >
        <MoreVerticalIcon aria-hidden="true" className="size-5" />
      </button>
      <ResponsiveDialogContent showCloseButton restoreFocusRef={triggerRef}>
        <ResponsiveDialogHeader className="pe-14">
          <ResponsiveDialogTitle className="text-lead font-semibold tracking-normal [font-variation-settings:normal]">
            {groupName}
          </ResponsiveDialogTitle>
          {roleLine ? (
            <ResponsiveDialogDescription className="text-meta">
              {roleLine}
            </ResponsiveDialogDescription>
          ) : (
            <ResponsiveDialogDescription className="sr-only">
              Group actions
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-2.5 px-4 pb-4 md:px-0 md:pb-0">
          {groups.map((list, index) => (
            <SheetMenu key={index}>
              {list.map((row) =>
                row.href !== undefined ? (
                  <SheetMenuRow
                    key={row.item}
                    label={row.label}
                    icon={row.icon}
                    trailing="chevron"
                    href={row.href}
                    onSelect={() => setOpen(false)}
                  />
                ) : (
                  <SheetMenuRow
                    key={row.item}
                    label={row.label}
                    icon={row.icon}
                    trailing={DESTRUCTIVE.has(row.item) ? undefined : "chevron"}
                    tone={DESTRUCTIVE.has(row.item) ? "danger" : "default"}
                    onSelect={() => {
                      setOpen(false);
                      row.onSelect?.();
                    }}
                  />
                ),
              )}
            </SheetMenu>
          ))}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

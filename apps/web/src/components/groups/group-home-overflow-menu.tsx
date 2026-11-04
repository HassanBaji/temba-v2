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
import { useLocale, useMessages } from "~/components/locale-provider";
import type { GroupHomeOverflowItem } from "@repo/domain/group-home-cta";
import { groupLeaveVenueActionLabel } from "@repo/domain/group-link-request";
import { groupMenuLabel } from "@repo/domain/group-settings";
import { groupEditHref, groupSeasonsHref } from "~/lib/dashboard-paths";

const DESTRUCTIVE: ReadonlySet<GroupHomeOverflowItem> = new Set([
  "leave_venue_community",
  "leave",
  "delete",
]);

type Row = {
  label: string;
  hint?: string | null;
  disabled?: boolean;
  icon: LucideIcon;
  iconClassName?: string;
  href?: string;
  onSelect?: () => void;
};

/** The More menu on Group home (design "Group create and edit flow" 02). */
export function GroupHomeOverflowMenu({
  items,
  groupId,
  groupName,
  roleLine,
  leaveBlockedHint,
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
  /** Why Leave is disabled, or `null` when the viewer may leave. */
  leaveBlockedHint: string | null;
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
  const m = useMessages();
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const rowFor = (item: GroupHomeOverflowItem): Row | null => {
    switch (item) {
      case "edit":
        return {
          label: groupMenuLabel("edit", locale),
          icon: PencilIcon,
          href: groupEditHref(groupId),
        };
      case "open_community":
        return communityId
          ? {
              label: m.webGroup.overflow.openCommunity(
                communityName ?? m.community.fallbackName,
              ),
              icon: UsersIcon,
              href: `/dashboard/communities/${communityId}`,
            }
          : null;
      case "all_communities":
        return {
          label: m.webGroup.overflow.allCommunities,
          icon: UsersIcon,
          href: "/dashboard/communities",
        };
      case "create_game":
        return {
          label: m.webGroup.createGame,
          icon: PlusIcon,
          href: `/dashboard/games/new?groupId=${groupId}`,
        };
      case "copy_group_url":
        return {
          label: groupMenuLabel("copy_link", locale),
          icon: LinkIcon,
          onSelect: onCopyGroupUrl,
        };
      case "manage_invites":
        return {
          label: groupMenuLabel("invite", locale),
          icon: UserRoundPlusIcon,
          onSelect: onManageInvites,
        };
      case "change_image":
        return {
          label: m.webGroup.overflow.changeImage,
          icon: ImageIcon,
          onSelect: onChangeImage,
        };
      case "remove_image":
        return {
          label: m.group.admin.removeImageConfirm.confirmLabel,
          icon: ImageOffIcon,
          onSelect: onRemoveImage,
        };
      case "seasons":
        return {
          label: m.webGroup.overflow.seasons,
          icon: CalendarRangeIcon,
          href: groupSeasonsHref(groupId),
        };
      case "leave_venue_community":
        return venueName
          ? {
              label: groupLeaveVenueActionLabel(venueName, locale),
              icon: UnlinkIcon,
              onSelect: onLeaveVenueCommunity,
            }
          : null;
      case "leave":
        return {
          label: groupMenuLabel("leave", locale),
          hint: leaveBlockedHint,
          disabled: leaveBlockedHint != null,
          icon: LogOutIcon,
          iconClassName: "rtl:-scale-x-100",
          onSelect: onLeave,
        };
      case "delete":
        return {
          label: m.group.settings.delete.deleteLabel,
          hint: m.group.settings.edit.deleteHint,
          icon: Trash2Icon,
          onSelect: onDelete,
        };
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
        aria-label={m.webGroup.overflow.groupActions}
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
              {m.webGroup.overflow.groupActions}
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
                    iconClassName={row.iconClassName}
                    trailing="chevron"
                    href={row.href}
                    onSelect={() => setOpen(false)}
                  />
                ) : (
                  <SheetMenuRow
                    key={row.item}
                    label={row.label}
                    hint={row.hint}
                    disabled={row.disabled}
                    icon={row.icon}
                    iconClassName={row.iconClassName}
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

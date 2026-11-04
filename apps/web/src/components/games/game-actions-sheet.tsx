"use client";

import { MoreVerticalIcon, type LucideIcon } from "lucide-react";
import { useState, type RefObject } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { SheetMenu, SheetMenuRow } from "~/components/common/sheet-menu";
import { cn } from "~/lib/utils";

export type GameActionsSheetRow = {
  key: string;
  label: string;
  hint?: string | null;
  icon: LucideIcon;
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
};

/**
 * The More menu on Game details, as a bottom sheet on phones and a dialog on
 * wider screens, the same shape as the Group home More menu. Each inner list
 * of `groups` renders as one bordered block; destructive rows go last.
 */
export function GameActionsSheet({
  title,
  description,
  groups,
  label = "Game actions",
  triggerRef,
  triggerClassName,
}: {
  title: string;
  description?: string | null;
  groups: GameActionsSheetRow[][];
  label?: string;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const blocks = groups.filter((rows) => rows.length > 0);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "focus-visible:ring-ring/50 hover:bg-wash inline-flex size-11 shrink-0 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]",
          triggerClassName ?? "bg-wash text-ink hover:bg-rule",
        )}
      >
        <MoreVerticalIcon aria-hidden="true" className="size-5" />
      </button>
      <ResponsiveDialogContent showCloseButton restoreFocusRef={triggerRef}>
        <ResponsiveDialogHeader className="pr-14">
          <ResponsiveDialogTitle className="text-lead font-semibold tracking-normal [font-variation-settings:normal]">
            {title}
          </ResponsiveDialogTitle>
          {description ? (
            <ResponsiveDialogDescription className="text-meta">
              {description}
            </ResponsiveDialogDescription>
          ) : (
            <ResponsiveDialogDescription className="sr-only">
              {label}
            </ResponsiveDialogDescription>
          )}
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-2.5 px-4 pb-4 md:px-0 md:pb-0">
          {blocks.map((rows, index) => (
            <SheetMenu key={index}>
              {rows.map((row) => {
                const danger = row.tone === "danger";
                const close = () => setOpen(false);
                return row.href !== undefined ? (
                  <SheetMenuRow
                    key={row.key}
                    label={row.label}
                    hint={row.hint}
                    icon={row.icon}
                    trailing="chevron"
                    disabled={row.disabled}
                    href={row.href}
                    onSelect={close}
                  />
                ) : (
                  <SheetMenuRow
                    key={row.key}
                    label={row.label}
                    hint={row.hint}
                    icon={row.icon}
                    trailing={danger ? undefined : "chevron"}
                    tone={danger ? "danger" : "default"}
                    disabled={row.disabled}
                    onSelect={() => {
                      close();
                      row.onSelect?.();
                    }}
                  />
                );
              })}
            </SheetMenu>
          ))}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

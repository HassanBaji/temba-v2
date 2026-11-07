"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { CloseButton } from "~/components/ui/nav-icon-button";
import { cn } from "~/lib/utils";

/**
 * The marks sheets' chrome: a drawer on phones and a dialog from `sm` up,
 * with the title, its line, the close (or a step's own action), a scrolling
 * body and a footer that stays put.
 */
export function MarksSheet({
  open,
  onClose,
  title,
  subtitle,
  action,
  footer,
  titleSize = "h1",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  /** Takes the close button's place, as Back does on the second step. */
  action?: React.ReactNode;
  footer?: React.ReactNode;
  titleSize?: "h1" | "title";
  children: React.ReactNode;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 px-[22px] pt-[22px]">
          <ResponsiveDialogHeader className="min-w-0 p-0 text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
            <ResponsiveDialogTitle
              className={cn(
                "font-expanded leading-none",
                titleSize === "h1"
                  ? "text-h1 tracking-[-0.03em]"
                  : "text-title tracking-[-0.01em]",
              )}
            >
              {title}
            </ResponsiveDialogTitle>
            {subtitle ? (
              <ResponsiveDialogDescription className="text-meta leading-relaxed">
                {subtitle}
              </ResponsiveDialogDescription>
            ) : (
              <ResponsiveDialogDescription className="sr-only">
                {title}
              </ResponsiveDialogDescription>
            )}
          </ResponsiveDialogHeader>
          {action ?? <CloseButton variant="boxed" onClick={onClose} />}
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-[22px] py-5">
          {children}
        </div>

        {footer ? (
          <div className="mt-auto flex shrink-0 flex-col gap-2.5 px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-1">
            {footer}
          </div>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
